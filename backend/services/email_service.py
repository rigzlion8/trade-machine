import httpx
import logging
from typing import Optional
from config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class EmailService:
    def __init__(self):
        self.api_key = settings.resend_api_key
        self.sender_email = settings.sender_email
        self.base_url = "https://api.resend.com"
    
    async def send_verification_email(self, to_email: str, verification_token: str, user_name: str) -> bool:
        """Send email verification email to user."""
        try:
            if not self.api_key:
                logger.warning("Resend API key not configured, skipping email verification")
                return False
            
            verification_url = f"{settings.frontend_url}/verify-email?token={verification_token}"
            
            email_data = {
                "from": f"Trade Machine <{self.sender_email}>",
                "to": [to_email],
                "subject": "Verify your Trade Machine account",
                "html": self._get_verification_email_html(user_name, verification_url)
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/emails",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json=email_data,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    logger.info(f"Verification email sent successfully to {to_email}")
                    return True
                else:
                    logger.error(f"Failed to send verification email: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error sending verification email: {e}")
            return False
    
    async def send_welcome_email(self, to_email: str, user_name: str) -> bool:
        """Send welcome email to user after successful verification."""
        try:
            if not self.api_key:
                logger.warning("Resend API key not configured, skipping welcome email")
                return False
            
            email_data = {
                "from": f"Trade Machine <{self.sender_email}>",
                "to": [to_email],
                "subject": "Welcome to Trade Machine!",
                "html": self._get_welcome_email_html(user_name)
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/emails",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json=email_data,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    logger.info(f"Welcome email sent successfully to {to_email}")
                    return True
                else:
                    logger.error(f"Failed to send welcome email: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error sending welcome email: {e}")
            return False
    
    def _get_verification_email_html(self, user_name: str, verification_url: str) -> str:
        """Generate HTML for verification email."""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify your Trade Machine account</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f9fafb;
                }}
                .container {{
                    background: white;
                    border-radius: 8px;
                    padding: 40px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .logo {{
                    font-size: 24px;
                    font-weight: bold;
                    color: #3B82F6;
                    margin-bottom: 10px;
                }}
                .title {{
                    font-size: 28px;
                    font-weight: bold;
                    color: #1f2937;
                    margin-bottom: 20px;
                }}
                .content {{
                    margin-bottom: 30px;
                }}
                .button {{
                    display: inline-block;
                    background-color: #3B82F6;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: 600;
                    margin: 20px 0;
                }}
                .button:hover {{
                    background-color: #2563eb;
                }}
                .footer {{
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    font-size: 14px;
                    color: #6b7280;
                    text-align: center;
                }}
                .link {{
                    color: #3B82F6;
                    word-break: break-all;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">TM</div>
                    <h1 class="title">Trade Machine</h1>
                </div>
                
                <div class="content">
                    <h2>Welcome to Trade Machine, {user_name}!</h2>
                    <p>Thank you for creating your account. To complete your registration and start trading, please verify your email address by clicking the button below:</p>
                    
                    <div style="text-align: center;">
                        <a href="{verification_url}" class="button">Verify Email Address</a>
                    </div>
                    
                    <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
                    <p><a href="{verification_url}" class="link">{verification_url}</a></p>
                    
                    <p><strong>This verification link will expire in 24 hours.</strong></p>
                    
                    <p>If you didn't create an account with Trade Machine, you can safely ignore this email.</p>
                </div>
                
                <div class="footer">
                    <p>This email was sent by Trade Machine. If you have any questions, please contact our support team.</p>
                    <p>&copy; 2024 Trade Machine. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _get_welcome_email_html(self, user_name: str) -> str:
        """Generate HTML for welcome email."""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Trade Machine!</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f9fafb;
                }}
                .container {{
                    background: white;
                    border-radius: 8px;
                    padding: 40px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .logo {{
                    font-size: 24px;
                    font-weight: bold;
                    color: #3B82F6;
                    margin-bottom: 10px;
                }}
                .title {{
                    font-size: 28px;
                    font-weight: bold;
                    color: #1f2937;
                    margin-bottom: 20px;
                }}
                .content {{
                    margin-bottom: 30px;
                }}
                .button {{
                    display: inline-block;
                    background-color: #3B82F6;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: 600;
                    margin: 20px 0;
                }}
                .button:hover {{
                    background-color: #2563eb;
                }}
                .footer {{
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    font-size: 14px;
                    color: #6b7280;
                    text-align: center;
                }}
                .feature {{
                    margin: 20px 0;
                    padding: 15px;
                    background-color: #f8fafc;
                    border-radius: 6px;
                    border-left: 4px solid #3B82F6;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">TM</div>
                    <h1 class="title">Welcome to Trade Machine!</h1>
                </div>
                
                <div class="content">
                    <h2>Hello {user_name}!</h2>
                    <p>Congratulations! Your email has been verified and your Trade Machine account is now active.</p>
                    
                    <p>You can now access all the features of our platform:</p>
                    
                    <div class="feature">
                        <h3>🤖 AI-Powered Trading Bots</h3>
                        <p>Create and manage automated trading bots with advanced strategies.</p>
                    </div>
                    
                    <div class="feature">
                        <h3>💰 Integrated Wallet</h3>
                        <p>Manage your funds with our secure mobile wallet integration.</p>
                    </div>
                    
                    <div class="feature">
                        <h3>📊 Real-time Analytics</h3>
                        <p>Track your trading performance with detailed analytics and reports.</p>
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="{settings.frontend_url}/dashboard" class="button">Get Started</a>
                    </div>
                    
                    <p>If you have any questions or need help getting started, don't hesitate to reach out to our support team.</p>
                </div>
                
                <div class="footer">
                    <p>This email was sent by Trade Machine. If you have any questions, please contact our support team.</p>
                    <p>&copy; 2024 Trade Machine. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

# Create a global instance
email_service = EmailService()
