import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    const user =
      this.config.get<string>('SMTP_USER') || process.env.SMTP_USER || '';
    const pass =
      this.config.get<string>('SMTP_PASS') || process.env.SMTP_PASS || '';
    const host =
      this.config.get<string>('SMTP_HOST') ||
      process.env.SMTP_HOST ||
      'smtp.resend.com';
    const port = Number(
      this.config.get<string>('SMTP_PORT') || process.env.SMTP_PORT || 465,
    );

    this.logger.log(
      `SMTP transport configured: host=${host}, port=${port}, secure=${port === 465}, user=${user ? user : '(none)'}`,
    );

    if (!user || !pass) {
      this.logger.warn('SMTP credentials not configured. Outgoing mail will fail or be rejected.');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendPasswordResetPin(email: string, pin: string, name?: string): Promise<boolean> {
    const recipientName = name || 'Patient / Staff Member';
    const from =
      this.config.get<string>('SMTP_FROM') ||
      process.env.SMTP_FROM ||
      '"HPC Jashore" <no-reply@hpc.toufiquzzaman.com>';

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #059669; margin: 0; font-size: 24px; font-weight: 800;">HPC Jashore</h1>
          <p style="color: #64748b; margin: 4px 0 0; font-size: 13px;">Health &amp; Pain Care Center · ডাঃ মোঃ তৌফিক উজ জামান</p>
        </div>
        
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
          <h2 style="color: #166534; margin: 0 0 8px; font-size: 18px;">Password Reset Request</h2>
          <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #15803d;">
            Dear <strong>${recipientName}</strong>, we received a request to reset your password for the HPC Clinical &amp; Patient Portal.
          </p>
        </div>

        <p style="font-size: 14px; line-height: 1.5; margin-bottom: 12px;">Use the following 6-digit verification code to complete your password reset:</p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="https://hpc.toufiquzzaman.com/auth/reset-password?email=${encodeURIComponent(email)}&code=${pin}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 16px; padding: 14px 32px; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.3);">
            পাসওয়ার্ড রিসেট করুন (Reset Password Link)
          </a>
          <p style="font-size: 13px; color: #64748b; margin-bottom: 8px;">অথবা নিচের ৬-ডিজিটের পিন কোডটি ব্যবহার করুন:</p>
          <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #047857; background-color: #ecfdf5; border: 2px dashed #10b981; padding: 10px 24px; border-radius: 12px;">
            ${pin}
          </span>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 8px;">This code will expire in 15 minutes.</p>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          Direct Link: <a href="https://hpc.toufiquzzaman.com/auth/reset-password?email=${encodeURIComponent(email)}&code=${pin}" style="color: #059669; word-break: break-all;">https://hpc.toufiquzzaman.com/auth/reset-password?email=${encodeURIComponent(email)}&code=${pin}</a>
        </p>

        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          If you did not request this password reset, please ignore this email or notify the reception counter immediately.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

        <div style="font-size: 11px; color: #94a3b8; text-align: center;">
          <p style="margin: 2px 0;">Health &amp; Pain Care Center, Mujib Sarak, Jashore</p>
          <p style="margin: 2px 0;">Cell: 01711-XXXXXX · Automated clinical dispatch system</p>
        </div>
      </div>
    `;

    try {
      const info = await this.transporter.sendMail({
        from,
        to: email,
        subject: `HPC Jashore - Password Reset Code: ${pin}`,
        text: `Reset your password directly: https://hpc.toufiquzzaman.com/auth/reset-password?email=${encodeURIComponent(email)}&code=${pin}\n\nYour 6-digit code is: ${pin}`,
        html,
      });
      this.logger.log(`Password reset email sent to ${email} (MessageID: ${info.messageId})`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send password reset email to ${email}: ${err.message}`, err.stack);
      return false;
    }
  }

  async sendVerificationCode(email: string, code: string, name?: string): Promise<boolean> {
    const recipientName = name || 'Patient / User';
    const from =
      this.config.get<string>('SMTP_FROM') ||
      process.env.SMTP_FROM ||
      '"HPC Jashore" <no-reply@hpc.toufiquzzaman.com>';

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #059669; margin: 0; font-size: 24px; font-weight: 800;">HPC Jashore</h1>
          <p style="color: #64748b; margin: 4px 0 0; font-size: 13px;">Health &amp; Pain Care Center · ডাঃ মোঃ তৌফিক উজ জামান</p>
        </div>
        
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
          <h2 style="color: #166534; margin: 0 0 8px; font-size: 18px;">Verify Your Account</h2>
          <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #15803d;">
            Welcome, <strong>${recipientName}</strong>! Please verify your email address to activate your HPC clinical account.
          </p>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="https://hpc.toufiquzzaman.com/auth/verify?email=${encodeURIComponent(email)}&code=${code}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 16px; padding: 14px 32px; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.3);">
            ইমেইল ভেরিফাই করুন (Verify Email Link)
          </a>
          <p style="font-size: 13px; color: #64748b; margin-bottom: 8px;">অথবা নিচের ভেরিফিকেশন কোডটি ব্যবহার করুন:</p>
          <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #047857; background-color: #ecfdf5; border: 2px dashed #10b981; padding: 10px 24px; border-radius: 12px;">
            ${code}
          </span>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Enter this verification code in the portal to confirm your email.</p>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          Direct Link: <a href="https://hpc.toufiquzzaman.com/auth/verify?email=${encodeURIComponent(email)}&code=${code}" style="color: #059669; word-break: break-all;">https://hpc.toufiquzzaman.com/auth/verify?email=${encodeURIComponent(email)}&code=${code}</a>
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <div style="font-size: 11px; color: #94a3b8; text-align: center;">
          <p style="margin: 2px 0;">Health &amp; Pain Care Center, Mujib Sarak, Jashore</p>
        </div>
      </div>
    `;

    try {
      const info = await this.transporter.sendMail({
        from,
        to: email,
        subject: `HPC Jashore - Email Verification Code: ${code}`,
        text: `Your email verification code is: ${code}`,
        html,
      });
      this.logger.log(`Verification email sent to ${email} (MessageID: ${info.messageId})`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send verification email to ${email}: ${err.message}`, err.stack);
      return false;
    }
  }
}
