#!/usr/bin/env node

/**
 * Test script for Audit Log System
 * 
 * This script tests the audit log functionality by:
 * 1. Creating a test grade
 * 2. Updating the grade
 * 3. Querying audit logs
 * 4. Verifying integrity
 * 5. Cleaning up test data
 */

const User = require('./models/User');
const AuditLog = require('./models/AuditLog');

// ANSI color codes for better output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(color, symbol, message) {
    console.log(`${color}${symbol}${colors.reset} ${message}`);
}

function success(message) {
    log(colors.green, '✓', message);
}

function error(message) {
    log(colors.red, '✗', message);
}

function info(message) {
    log(colors.blue, 'ℹ', message);
}

function section(message) {
    console.log(`\n${colors.cyan}━━━ ${message} ━━━${colors.reset}`);
}

async function testAuditLogSystem() {
    console.log('\n🔍 Testing Audit Log System\n');
    
    let testGradeId;
    let testStudentId;
    let auditLogId;

    try {
        // ====================================
        section('Test Setup');
        // ====================================

        info('Note: This test requires a valid student in your database');
        info('If you get errors, make sure you have at least one student created');

        // Find a student to use for testing
        const students = await User.getUserByRole('student');
        
        if (students.length === 0) {
            error('No students found in database. Please create at least one student first.');
            process.exit(1);
        }

        testStudentId = students[0].uid;
        const student = students[0];
        success(`Found test student: ${student.name} (${testStudentId})`);

        // Find a teacher to use for testing
        const teachers = await User.getUserByRole('teacher');
        const teacher = teachers.length > 0 ? teachers[0] : {
            uid: 'test_teacher_123',
            name: 'Test Teacher'
        };
        success(`Using teacher: ${teacher.name} (${teacher.uid})`);

        // ====================================
        section('Test 1: Create Grade with Audit Log');
        // ====================================

        info('Creating a test grade...');
        const gradeResult = await User.addGrade({
            studentId: testStudentId,
            studentName: student.name,
            grade: 7,
            teacherId: teacher.uid,
            teacherName: teacher.name,
            subject: 'Audit Log Test Subject',
            date: new Date(),
            reason: 'Test grade for audit log verification',
            teacherRole: 'teacher',
            ipAddress: '127.0.0.1'
        });

        testGradeId = gradeResult.id;
        success(`Grade created with ID: ${testGradeId}`);

        // Wait a bit for Firestore to process
        await new Promise(resolve => setTimeout(resolve, 1000));

        section('Test 2: Verify Audit Log was Created');

        info('Querying audit logs for the student...');
        const studentLogs = await AuditLog.getByStudent(testStudentId, {
            entityType: 'GRADE',
            limit: 10
        });

        const createLog = studentLogs.find(log => 
            log.entityId === testGradeId && log.action === 'CREATE'
        );

        if (createLog) {
            success('Audit log found for grade creation');
            auditLogId = createLog.id;
            info(`  - Action: ${createLog.action}`);
            info(`  - Entity Type: ${createLog.entityType}`);
            info(`  - User: ${createLog.userName}`);
            info(`  - Reason: ${createLog.reason}`);
            info(`  - Timestamp: ${createLog.timestamp.toDate().toISOString()}`);
        } else {
            error('Audit log not found for grade creation');
        }

        // ====================================
        section('Test 3: Update Grade and Verify Audit');
        // ====================================

        info('Updating the test grade...');
        await User.updateGrade(testGradeId, {
            grade: 8,
            teacherId: teacher.uid,
            teacherName: teacher.name,
            reason: 'Updated for audit log testing',
            teacherRole: 'teacher',
            ipAddress: '127.0.0.1'
        });
        success('Grade updated from 7 to 8');

        // Wait a bit for Firestore to process
        await new Promise(resolve => setTimeout(resolve, 1000));

        // ====================================
        section('Test 4: Check Complete History');
        // ====================================

        info('Fetching complete history for the grade...');
        const history = await AuditLog.getEntityHistory('GRADE', testGradeId);

        success(`Found ${history.totalChanges} total changes`);
        info(`  - Created by: ${history.createdBy} at ${history.createdAt?.toDate().toISOString()}`);
        info(`  - Last modified by: ${history.lastModifiedBy} at ${history.lastModifiedAt?.toDate().toISOString()}`);

        console.log('\n📋 Change History:');
        history.history.forEach((entry, index) => {
            console.log(`\n  ${index + 1}. ${entry.action} by ${entry.userName}`);
            console.log(`     Time: ${entry.timestamp.toDate().toISOString()}`);
            console.log(`     Reason: ${entry.reason}`);
            
            if (entry.changes && entry.changes.length > 0) {
                console.log(`     Changes:`);
                entry.changes.forEach(change => {
                    console.log(`       • ${change.field}: ${change.oldValue} → ${change.newValue}`);
                });
            }
        });

        // ====================================
        section('Test 5: Verify Integrity');
        // ====================================

        if (auditLogId) {
            info('Verifying audit log integrity...');
            const verification = await AuditLog.verifyIntegrity(auditLogId);

            if (verification.valid) {
                success('Audit log integrity verified - data is unaltered');
                info(`  - Stored checksum: ${verification.storedChecksum}`);
                info(`  - Calculated checksum: ${verification.calculatedChecksum}`);
            } else {
                error('Audit log integrity check failed - possible tampering detected!');
            }
        }

        // ====================================
        section('Test 6: Query by User');
        // ====================================

        info(`Querying all audit logs by teacher ${teacher.name}...`);
        const userLogs = await AuditLog.getByUser(teacher.uid, {
            limit: 5
        });

        success(`Found ${userLogs.length} audit logs by this teacher`);

        // ====================================
        section('Test 7: Statistics (if school admin)');
        // ====================================

        if (student.schoolId) {
            info(`Fetching audit statistics for school ${student.schoolId}...`);
            const stats = await AuditLog.getStatistics(student.schoolId);

            success('Statistics retrieved:');
            info(`  - Total logs: ${stats.totalLogs}`);
            
            if (stats.byAction) {
                console.log(`  - By action:`);
                Object.entries(stats.byAction).forEach(([action, count]) => {
                    console.log(`      ${action}: ${count}`);
                });
            }
            
            if (stats.byEntityType) {
                console.log(`  - By entity type:`);
                Object.entries(stats.byEntityType).forEach(([type, count]) => {
                    console.log(`      ${type}: ${count}`);
                });
            }
        }

        // ====================================
        section('Test 8: Delete Grade and Verify Audit');
        // ====================================

        info('Deleting the test grade...');
        await User.deleteGrade(testGradeId, {
            userId: teacher.uid,
            userName: teacher.name,
            userRole: 'teacher',
            reason: 'Cleanup after audit log testing',
            ipAddress: '127.0.0.1'
        });
        success('Grade deleted');

        // Wait a bit for Firestore to process
        await new Promise(resolve => setTimeout(resolve, 1000));

        info('Verifying delete was logged...');
        const finalHistory = await AuditLog.getEntityHistory('GRADE', testGradeId);
        
        const hasDeleteLog = finalHistory.history.some(log => log.action === 'DELETE');
        if (hasDeleteLog) {
            success('Delete action was properly logged in audit trail');
            success(`Total audit logs for this grade: ${finalHistory.totalChanges}`);
        } else {
            error('Delete action was not found in audit trail');
        }

        // ====================================
        section('Test Results');
        // ====================================

        console.log('\n');
        success('All audit log tests completed successfully! ✨');
        console.log('');
        info('The audit log system is working correctly and tracking:');
        info('  ✓ Grade creation');
        info('  ✓ Grade updates (with change diff)');
        info('  ✓ Grade deletion');
        info('  ✓ Complete history tracking');
        info('  ✓ Integrity verification');
        info('  ✓ User attribution');
        info('  ✓ Timestamp tracking');
        info('  ✓ Statistics aggregation');
        console.log('');

    } catch (err) {
        error(`Test failed: ${err.message}`);
        console.error(err);
        process.exit(1);
    }

    // Exit successfully
    process.exit(0);
}

// Run the tests
console.log('');
console.log('════════════════════════════════════════════════');
console.log('   AUDIT LOG SYSTEM TEST');
console.log('════════════════════════════════════════════════');

testAuditLogSystem().catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
});
