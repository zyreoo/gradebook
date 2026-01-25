/**
 * Validates Romanian CNP (Cod Numeric Personal) - 13-digit personal numeric code.
 * @param {string} cnp - The CNP string to validate
 * @returns {{ valid: boolean, error?: string }}
 */
function validateCNP(cnp) {
    if (!cnp || typeof cnp !== 'string') {
        return { valid: false, error: 'CNP is required' };
    }

    const cleaned = cnp.trim().replace(/\s/g, '');
    if (cleaned.length !== 13) {
        return { valid: false, error: 'CNP must have exactly 13 digits' };
    }

    if (!/^\d{13}$/.test(cleaned)) {
        return { valid: false, error: 'CNP must contain only digits' };
    }

    const digits = cleaned.split('').map(Number);
    const key = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];

    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += digits[i] * key[i];
    }

    let control = sum % 11;
    if (control === 10) {
        control = 1;
    }

    if (control !== digits[12]) {
        return { valid: false, error: 'CNP is invalid (checksum does not match)' };
    }

    // Validate first digit (sex/century): 1-9
    if (digits[0] < 1 || digits[0] > 9) {
        return { valid: false, error: 'CNP is invalid (invalid first digit)' };
    }

    // Validate date: positions 2-7 in CNP = indices 1-6 (YY MM DD)
    const yy = digits[1] * 10 + digits[2];
    const mm = digits[3] * 10 + digits[4];
    const dd = digits[5] * 10 + digits[6];

    const century = digits[0] <= 2 ? 1900 : digits[0] <= 4 ? 1800 : digits[0] <= 6 ? 2000 : digits[0] <= 8 ? 1800 : 2000;
    const year = century + yy;

    if (mm < 1 || mm > 12) {
        return { valid: false, error: 'CNP is invalid (invalid month)' };
    }
    const lastDay = new Date(year, mm, 0).getDate();
    if (dd < 1 || dd > lastDay) {
        return { valid: false, error: 'CNP is invalid (invalid day)' };
    }

    // County code: positions 8-9 in CNP = indices 7-8
    const county = digits[7] * 10 + digits[8];
    if ((county < 1 || county > 52) && county !== 99) {
        return { valid: false, error: 'CNP is invalid (invalid county code)' };
    }

    return { valid: true };
}

module.exports = { validateCNP };
