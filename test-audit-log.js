#!/usr/bin/env node

require('./config/firebase');
const AuditLog = require('./models/AuditLog');
const { db } = require('./config/firebase');

const TEST_SCHOOL = 'audit-test-school-id';
const TEST_STUDENT = 'audit-test-student-id';
const TEST_TEACHER = 'audit-test-teacher-id';
const TEST_GRADE_ID = 'audit-test-grade-1';
const TEST_ABSENCE_ID = 'audit-test-absence-1';

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', blue: '\x1b[34m', yellow: '\x1b[33m' };
function ok(msg) { console.log(`${colors.green}✓${colors.reset} ${msg}`); }
function fail(msg) { console.log(`${colors.red}✗${colors.reset} ${msg}`); }
function info(msg) { console.log(`${colors.blue}ℹ${colors.reset} ${msg}`); }
function skip(msg) { console.log(`${colors.yellow}⊘${colors.reset} ${msg}`); }

let createdIds = [];
let passed = 0;
let failed = 0;
let skipped = 0;

function assert(condition, name) {
    if (condition) { ok(name); passed++; return true; }
    fail(name); failed++; return false;
}

function isIndexError(e) {
    return e && (e.code === 9 || (e.message && e.message.includes('requires an index')));
}

async function cleanup() {
    if (createdIds.length === 0) return;
    const batch = db.batch();
    for (const id of createdIds) {
        batch.delete(db.collection('audit_logs').doc(id));
    }
    await batch.commit();
    info(`Cleaned up ${createdIds.length} test audit log(s)`);
}

async function run() {
    console.log('\n=== Audit Log Tests ===\n');

    try {
        const createGrade = await AuditLog.create({
            action: 'CREATE',
            entityType: 'GRADE',
            entityId: TEST_GRADE_ID,
            userId: TEST_TEACHER,
            userName: 'Test Teacher',
            userRole: 'teacher',
            oldData: null,
            newData: { grade: 8, subject: 'Math', studentId: TEST_STUDENT },
            reason: 'Test grade created',
            schoolId: TEST_SCHOOL,
            studentId: TEST_STUDENT
        });
        createdIds.push(createGrade.id);
        assert(createGrade.id && createGrade.checksum && createGrade.timestamp, 'AuditLog.create (CREATE GRADE)');

        const createAbsence = await AuditLog.create({
            action: 'CREATE',
            entityType: 'ABSENCE',
            entityId: TEST_ABSENCE_ID,
            userId: TEST_TEACHER,
            userName: 'Test Teacher',
            userRole: 'teacher',
            oldData: null,
            newData: { type: 'unmotivated', subject: 'Math', studentId: TEST_STUDENT },
            reason: 'Test absence created',
            schoolId: TEST_SCHOOL,
            studentId: TEST_STUDENT
        });
        createdIds.push(createAbsence.id);
        assert(createAbsence.id && createAbsence.entityType === 'ABSENCE', 'AuditLog.create (CREATE ABSENCE)');

        const updateAbsence = await AuditLog.create({
            action: 'UPDATE',
            entityType: 'ABSENCE',
            entityId: TEST_ABSENCE_ID,
            userId: TEST_TEACHER,
            userName: 'Test Teacher',
            userRole: 'teacher',
            oldData: { type: 'unmotivated' },
            newData: { type: 'motivated', reason: 'Doctor note' },
            reason: 'Absence motivated',
            schoolId: TEST_SCHOOL,
            studentId: TEST_STUDENT
        });
        createdIds.push(updateAbsence.id);
        assert(updateAbsence.oldData && updateAbsence.newData, 'AuditLog.create (UPDATE ABSENCE)');

        const byEntity = await AuditLog.getByEntity('GRADE', TEST_GRADE_ID);
        assert(Array.isArray(byEntity) && byEntity.length >= 1 && byEntity[0].entityId === TEST_GRADE_ID, 'AuditLog.getByEntity');

        let byStudent;
        try {
            byStudent = await AuditLog.getByStudent(TEST_STUDENT, { limit: 10 });
            assert(Array.isArray(byStudent) && byStudent.length >= 3, 'AuditLog.getByStudent');
        } catch (e) {
            if (isIndexError(e)) { skip('AuditLog.getByStudent (index required: studentId + timestamp)'); skipped++; }
            else throw e;
        }

        try {
            const bySchool = await AuditLog.getBySchool(TEST_SCHOOL, { limit: 10 });
            assert(Array.isArray(bySchool) && bySchool.length >= 3, 'AuditLog.getBySchool');
        } catch (e) {
            if (isIndexError(e)) { skip('AuditLog.getBySchool (Firestore index required)'); skipped++; }
            else throw e;
        }

        try {
            const byUser = await AuditLog.getByUser(TEST_TEACHER, { limit: 10 });
            assert(Array.isArray(byUser) && byUser.length >= 3, 'AuditLog.getByUser');
        } catch (e) {
            if (isIndexError(e)) { skip('AuditLog.getByUser (Firestore index required)'); skipped++; }
            else throw e;
        }

        try {
            const recent = await AuditLog.getRecent(20, { schoolId: TEST_SCHOOL });
            assert(Array.isArray(recent) && recent.length >= 3, 'AuditLog.getRecent (filtered by school)');
        } catch (e) {
            if (isIndexError(e)) { skip('AuditLog.getRecent (Firestore index required)'); skipped++; }
            else throw e;
        }

        let history;
        try {
            history = await AuditLog.getEntityHistory('ABSENCE', TEST_ABSENCE_ID);
            assert(history.entityType === 'ABSENCE' && history.entityId === TEST_ABSENCE_ID && history.totalChanges >= 2 && Array.isArray(history.history), 'AuditLog.getEntityHistory');
        } catch (e) {
            if (isIndexError(e)) { skip('AuditLog.getEntityHistory (index required)'); skipped++; }
            else throw e;
        }

        const verification = await AuditLog.verifyIntegrity(createGrade.id);
        assert(verification.valid === true && verification.auditLogId === createGrade.id, 'AuditLog.verifyIntegrity');

        let stats;
        try {
            stats = await AuditLog.getStatistics(TEST_SCHOOL);
            assert(typeof stats.totalLogs === 'number' && stats.byAction && stats.byEntityType, 'AuditLog.getStatistics');
        } catch (e) {
            if (isIndexError(e)) { skip('AuditLog.getStatistics (Firestore index required)'); skipped++; }
            else throw e;
        }

        try {
            await AuditLog.create({
                action: 'INVALID',
                entityType: 'GRADE',
                entityId: 'x',
                userId: 'u',
                userName: 'u'
            });
            assert(false, 'AuditLog.create rejects invalid action');
        } catch (e) {
            assert(e.message && e.message.includes('Invalid action'), 'AuditLog.create rejects invalid action');
        }

        try {
            await AuditLog.create({
                action: 'CREATE',
                entityType: 'INVALID',
                entityId: 'x',
                userId: 'u',
                userName: 'u'
            });
            assert(false, 'AuditLog.create rejects invalid entityType');
        } catch (e) {
            assert(e.message && e.message.includes('Invalid entity'), 'AuditLog.create rejects invalid entityType');
        }
    } catch (err) {
        fail(`Fatal: ${err.message}`);
        console.error(err);
        failed++;
    } finally {
        await cleanup();
    }

    console.log('\n---');
    if (skipped > 0) info(`Run \`npm run indexes:deploy\` for index setup, then re-run to cover skipped queries.`);
    if (failed === 0) {
        ok(`All ${passed} audit log tests passed.` + (skipped ? ` (${skipped} skipped)` : ''));
        process.exit(0);
    } else {
        fail(`${passed} passed, ${failed} failed.` + (skipped ? ` (${skipped} skipped)` : ''));
        process.exit(1);
    }
}

run();
