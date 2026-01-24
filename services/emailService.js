const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initTransporter();
    }

    initTransporter() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            secure: true,
            port: 465,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD
            },
            tls: {
                rejectUnauthorized: true
            }
        });
    }

    async sendOTP(email, code, userName) {
        const mailOptions = {
            from: `"${process.env.SCHOOL_NAME || 'Online Gradebook'}" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Login Verification Code',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f7;">
                    <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
                        <div style="background: #007aff; padding: 32px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Verification Code</h1>
                        </div>
                        <div style="padding: 40px 32px;">
                            <p style="margin: 0 0 24px; color: #1d1d1f; font-size: 17px; line-height: 1.5;">
                                Hello ${userName},
                            </p>
                            <p style="margin: 0 0 32px; color: #1d1d1f; font-size: 17px; line-height: 1.5;">
                                Your verification code is:
                            </p>
                            <div style="background: #f5f5f7; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 32px;">
                                <div style="font-size: 48px; font-weight: 700; letter-spacing: 8px; color: #007aff; font-family: 'Courier New', monospace;">
                                    ${code}
                                </div>
                            </div>
                            <p style="margin: 0 0 16px; color: #86868b; font-size: 15px; line-height: 1.5;">
                                This code will expire in <strong>10 minutes</strong>.
                            </p>
                            <p style="margin: 0; color: #86868b; font-size: 15px; line-height: 1.5;">
                                If you didn't request this code, please ignore this email.
                            </p>
                        </div>
                        <div style="background: #f5f5f7; padding: 24px 32px; text-align: center; border-top: 1px solid #d2d2d7;">
                            <p style="margin: 0; color: #86868b; font-size: 13px;">
                                ${process.env.SCHOOL_NAME || 'Online Gradebook'} • Secure Login System
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            return { success: true };
        } catch (error) {
            console.error('Email sending error:', error);
            return { success: false, error: error.message };
        }
    }

    async testConnection() {
        try {
            await this.transporter.verify();
            return { success: true };
        } catch (error) {
            console.error('Email service connection error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new EmailService();
