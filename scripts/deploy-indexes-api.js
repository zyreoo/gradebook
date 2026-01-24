#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

const PROJECT_ID = 'onlinerecordbook-fb9c8';
const DB = '(default)';
const INDEXES_FILE = path.join(__dirname, '..', 'firestore.indexes.json');

function loadCredentials() {
    const keyPath = path.join(__dirname, '..', 'firebase-service-account.json');
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    }
    if (fs.existsSync(keyPath)) {
        return JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    }
    throw new Error('No credentials: set FIREBASE_SERVICE_ACCOUNT or add firebase-service-account.json');
}

async function getAccessToken(credentials) {
    const auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/datastore', 'https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    return token.token;
}

async function createIndex(accessToken, collectionGroup, index) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DB}/collectionGroups/${collectionGroup}/indexes`;
    const body = {
        queryScope: index.queryScope || 'COLLECTION',
        fields: index.fields
    };
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    const text = await res.text();
    if (!res.ok) {
        let err = text;
        try {
            const j = JSON.parse(text);
            err = j.error?.message || text;
        } catch (_) {}
        throw new Error(`HTTP ${res.status}: ${err}`);
    }
    return JSON.parse(text || '{}');
}

async function main() {
    const credentials = loadCredentials();
    const serviceAccountEmail = credentials.client_email || 'firebase-adminsdk-*@onlinerecordbook-fb9c8.iam.gserviceaccount.com';

    const indexes = JSON.parse(fs.readFileSync(INDEXES_FILE, 'utf8')).indexes || [];
    console.log(`Deploying ${indexes.length} Firestore indexes via Admin API (service account)...\n`);

    const accessToken = await getAccessToken(credentials);
    let ok = 0;
    let skip = 0;
    let fail = 0;

    for (const idx of indexes) {
        const cg = idx.collectionGroup || 'audit_logs';
        const label = `${cg} [${(idx.fields || []).map(f => f.fieldPath).join(', ')}]`;
        try {
            const op = await createIndex(accessToken, cg, idx);
            if (op.error) {
                console.log(`✗ ${label}: ${op.error.message}`);
                fail++;
            } else if (op.name && (op.name.includes('indexes/') || op.name.includes('operations/'))) {
                console.log(`✓ ${label}: created (building...)`);
                ok++;
            } else {
                console.log(`? ${label}: ${JSON.stringify(op).slice(0, 80)}`);
                skip++;
            }
        } catch (e) {
            if (e.message && (e.message.includes('already exists') || e.message.includes('ALREADY_EXISTS'))) {
                console.log(`⊘ ${label}: already exists`);
                skip++;
            } else {
                console.log(`✗ ${label}: ${e.message}`);
                fail++;
            }
        }
    }

    console.log(`\nDone: ${ok} created, ${skip} skipped, ${fail} failed.`);
    if (fail > 0) {
        console.log('\n--- Fix 403: grant index permission to the service account ---');
        console.log(`Service account: ${serviceAccountEmail}`);
        console.log('\nOption A – gcloud (requires Owner/IAM Admin):');
        console.log(`  gcloud projects add-iam-policy-binding ${PROJECT_ID} \\`);
        console.log(`    --member="serviceAccount:${serviceAccountEmail}" \\`);
        console.log(`    --role="roles/datastore.indexAdmin"`);
        console.log('\nOption B – Console: IAM & Admin → find the account above → Edit → Add role → Cloud Datastore Index Admin');
        process.exit(1);
    }
}

main().catch(e => {
    console.error(e.message || e);
    process.exit(1);
});
