import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    const user = this.config.get<string>('SMTP_USER') || 'healthandpaincarejashore@gmail.com';
    const pass = this.config.get<string>('SMTP_PASS') || 'oxis adoi gmag rkqd';
    const host = this.config.get<string>('SMTP_HOST') || 'smtp.gmail.com';
    const port = Number(this.config.get<string>('SMTP_PORT') || 465);

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendPasswordResetPin(email: string, pin: string, name?: string): Promise<boolean> {
    const recipientName = name || 'Patient / Staff Member';
    const from = this.config.get<string>('SMTP_FROM') || '"HPC Jashore" <healthandpaincarejashore@gmail.com>';

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
          <span style="display: inline-block; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #047857; background-color: #ecfdf5; border: 2px dashed #10b981; padding: 12px 28px; border-radius: 12px;">
            ${pin}
          </span>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 8px;">This code will expire in 15 minutes.</p>
        </div>

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
        text: `Your password reset verification code is: ${pin}. It expires in 15 minutes.`,
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
    const from = this.config.get<string>('SMTP_FROM') || '"HPC Jashore" <healthandpaincarejashore@gmail.com>';

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
          <span style="display: inline-block; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #047857; background-color: #ecfdf5; border: 2px dashed #10b981; padding: 12px 28px; border-radius: 12px;">
            ${code}
          </span>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Enter this verification code in the portal to confirm your email.</p>
        </div>

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
