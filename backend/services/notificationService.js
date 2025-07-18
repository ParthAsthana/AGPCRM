const nodemailer = require('nodemailer');
const database = require('../database/db');

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.initializeEmailService();
  }

  initializeEmailService() {
    // Initialize email service (configure with your SMTP settings)
    this.emailTransporter = nodemailer.createTransport({
      service: 'gmail', // or your email service
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
      }
    });

    // Test email configuration
    this.emailTransporter.verify((error, success) => {
      if (error) {
        console.warn('⚠️ Email service not configured:', error.message);
      } else {
        console.log('✅ Email service ready');
      }
    });
  }

  // Create in-app notification
  async createNotification(userId, title, message, type = 'info', relatedId = null, relatedType = null) {
    try {
      const result = await database.run(
        `INSERT INTO notifications (user_id, title, message, type, related_id, related_type)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, title, message, type, relatedId, relatedType]
      );

      console.log(`✅ Notification created for user ${userId}: ${title}`);
      return result.id;
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  }

  // Send email notification
  async sendEmail(to, subject, htmlContent, textContent = null) {
    if (!this.emailTransporter) {
      console.warn('⚠️ Email service not configured, skipping email');
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'AGP CRM <noreply@agpcrm.com>',
        to: to,
        subject: subject,
        html: htmlContent,
        text: textContent || htmlContent.replace(/<[^>]+>/g, '') // Strip HTML for text version
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${to}: ${subject}`);
      return result;
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return false;
    }
  }

  // Generate email template for task assignment
  generateTaskAssignmentEmail(assignedUserName, taskTitle, taskDescription, assignedByName, taskId) {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin: 0; font-size: 24px;">AGP CRM</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Task Assignment Notification</p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px;">Hi ${assignedUserName},</h2>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
              You have been assigned a new task by <strong>${assignedByName}</strong>.
            </p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #1f2937; margin: 0 0 10px 0; font-size: 18px;">${taskTitle}</h3>
            ${taskDescription ? `<p style="color: #4b5563; margin: 0; line-height: 1.5;">${taskDescription}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin-bottom: 25px;">
            <a href="${process.env.FRONTEND_URL || 'https://agpcrm-lemon.vercel.app'}/tasks" 
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
              View Task
            </a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              This is an automated notification from AGP CRM.<br>
              Please do not reply to this email.
            </p>
          </div>
        </div>
      </div>
    `;

    return htmlContent;
  }

  // Send task assignment notification (both in-app and email)
  async sendTaskAssignmentNotification(taskData, assignedUser, assignedByUser) {
    try {
      const title = `New Task Assigned: ${taskData.title}`;
      const message = `${assignedByUser.name} assigned you a new task: "${taskData.title}"`;

      // Create in-app notification
      await this.createNotification(
        assignedUser.id,
        title,
        message,
        'task',
        taskData.id,
        'task'
      );

      // Send email notification
      if (assignedUser.email) {
        const emailContent = this.generateTaskAssignmentEmail(
          assignedUser.name,
          taskData.title,
          taskData.description,
          assignedByUser.name,
          taskData.id
        );

        await this.sendEmail(
          assignedUser.email,
          title,
          emailContent
        );
      }

      console.log(`✅ Task assignment notifications sent to ${assignedUser.name}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending task assignment notifications:', error);
      return false;
    }
  }

  // Send task update notification
  async sendTaskUpdateNotification(taskData, updatedUser, updatedByUser, updateType) {
    try {
      let title, message;
      
      switch (updateType) {
        case 'status_change':
          title = `Task Status Updated: ${taskData.title}`;
          message = `${updatedByUser.name} updated task status to "${taskData.status}"`;
          break;
        case 'reassigned':
          title = `Task Reassigned: ${taskData.title}`;
          message = `${updatedByUser.name} reassigned this task to you`;
          break;
        default:
          title = `Task Updated: ${taskData.title}`;
          message = `${updatedByUser.name} updated the task`;
      }

      // Create in-app notification
      await this.createNotification(
        updatedUser.id,
        title,
        message,
        'task',
        taskData.id,
        'task'
      );

      console.log(`✅ Task update notification sent to ${updatedUser.name}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending task update notification:', error);
      return false;
    }
  }
}

module.exports = new NotificationService(); 