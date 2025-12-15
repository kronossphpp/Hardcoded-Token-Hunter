<div align="center">

# 🔐 Hardcoded Token Hunter

<img src="https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Chrome Extension">
<img src="https://img.shields.io/badge/Manifest-V3-green?style=for-the-badge" alt="Manifest V3">
<img src="https://img.shields.io/badge/Version-2.1.2-blue?style=for-the-badge" alt="Version">
<img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License">

### ⚡ Detect Hardcoded Tokens & Secrets in JavaScript Files

<p>
<img src="https://img.shields.io/badge/AWS-Keys_Detection-FF9900?style=flat-square&logo=amazonaws">
<img src="https://img.shields.io/badge/API-Token_Scanner-009688?style=flat-square&logo=key">
<img src="https://img.shields.io/badge/S3-Bucket_Takeover-569A31?style=flat-square&logo=amazons3">
<img src="https://img.shields.io/badge/Discord-Webhook-5865F2?style=flat-square&logo=discord">
</p>

[![Twitter](https://img.shields.io/badge/Twitter-@ofjaaah-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white)](https://twitter.com/ofjaaah)
[![YouTube](https://img.shields.io/badge/YouTube-OFJAAAH-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/c/OFJAAAH)

---

**Automatically find exposed API keys, tokens, and secrets while browsing**

</div>

---

## 📋 About

**Hardcoded Token Hunter** is a powerful Chrome extension designed for bug bounty hunters and security researchers. It automatically scans JavaScript files for hardcoded secrets, API keys, tokens, and sensitive data that shouldn't be exposed in client-side code.

---

## ⚡ Features

<table>
<tr>
<td width="50%">

### 🔍 Token Detection
- ✅ AWS Access Keys & Secret Keys
- ✅ Google API Keys & OAuth
- ✅ GitHub/GitLab Tokens
- ✅ Stripe API Keys
- ✅ Firebase Credentials
- ✅ JWT Tokens
- ✅ Private Keys (RSA/SSH)
- ✅ Database Connection Strings
- ✅ Slack Webhooks/Tokens
- ✅ Twilio API Keys
- ✅ SendGrid API Keys
- ✅ Mailgun API Keys
- ✅ And 50+ more patterns!

</td>
<td width="50%">

### 🛠️ Advanced Features
- 🔄 **Auto Mode**: Passive scanning while browsing
- 🎯 **Manual Mode**: On-demand deep scanning
- 🪣 **S3 Bucket Takeover Detection**
- 🕷️ **Deep Crawler**: Follow JS imports
- ✅ **Token Validation**: Verify if tokens are active
- 💬 **Discord Alerts**: Real-time webhook notifications
- 📊 **History Dashboard**: Track all findings
- ⚙️ **Customizable**: Add your own regex patterns

</td>
</tr>
</table>

---

## 🎯 Detected Secrets

| Category | Patterns |
|:---------|:---------|
| **Cloud Providers** | AWS, GCP, Azure, DigitalOcean, Heroku |
| **Payment** | Stripe, PayPal, Square, Braintree |
| **Communication** | Twilio, SendGrid, Mailgun, Slack |
| **Database** | MongoDB, PostgreSQL, MySQL, Redis |
| **Authentication** | JWT, OAuth, API Keys, Bearer Tokens |
| **Version Control** | GitHub, GitLab, Bitbucket |
| **CI/CD** | Travis CI, CircleCI, Jenkins |
| **Other** | Firebase, Algolia, Mapbox, Sentry |

---

## 🚀 Installation

```bash
# 1. Clone this repository
git clone https://github.com/KingOfBugbounty/Hardcoded-Token-Hunter.git

# 2. Open Chrome
chrome://extensions/

# 3. Enable "Developer mode" (top right corner)

# 4. Click "Load unpacked"

# 5. Select the cloned folder

# 6. Start hunting! 🎯
```

---

## 📖 How to Use

### 🔄 Auto Mode (Passive)

```
1️⃣  Enable Auto Mode in settings
         ↓
2️⃣  Browse websites normally
         ↓
3️⃣  Extension scans JS files automatically
         ↓
4️⃣  Get notified when secrets are found
         ↓
5️⃣  Check findings in the popup dashboard
```

### 🎯 Manual Mode (Active)

```
1️⃣  Navigate to target website
         ↓
2️⃣  Click extension icon
         ↓
3️⃣  Click "Deep Scan" button
         ↓
4️⃣  Extension crawls all JS files
         ↓
5️⃣  View detailed results with validation
```

---

## 🪣 S3 Bucket Takeover Detection

The extension automatically detects:

- ❌ Non-existent S3 buckets (takeover possible)
- ⚠️ Misconfigured bucket permissions
- 🔓 Publicly accessible buckets
- 📝 Bucket names in JS code

```javascript
// These patterns are detected:
"https://bucket-name.s3.amazonaws.com"
"s3://bucket-name/path"
"bucket-name.s3.region.amazonaws.com"
```

---

## 🔧 Configuration

### Discord Webhook

Get instant alerts when secrets are found:

1. Create a webhook in your Discord server
2. Go to extension **Settings**
3. Paste webhook URL
4. Enable Discord notifications

### Custom Patterns

Add your own regex patterns for specific targets:

```javascript
// Example: Custom API key pattern
{
  "name": "Custom API Key",
  "regex": "CUSTOM_[A-Za-z0-9]{32}",
  "severity": "high"
}
```

---

## 📊 Dashboard Features

<table>
<tr>
<td align="center">📈</td>
<td><b>Real-time Stats</b> - Tokens found, files scanned, pages analyzed</td>
</tr>
<tr>
<td align="center">📋</td>
<td><b>Findings List</b> - All detected secrets with source URLs</td>
</tr>
<tr>
<td align="center">✅</td>
<td><b>Validation Status</b> - Check if tokens are still active</td>
</tr>
<tr>
<td align="center">📤</td>
<td><b>Export</b> - Copy findings or export to JSON</td>
</tr>
<tr>
<td align="center">🕐</td>
<td><b>History</b> - Track all findings across sessions</td>
</tr>
</table>

---

## 🛡️ Security & Ethics

### ✅ Legitimate Use Cases

- 🎯 Bug bounty hunting
- 🔒 Security assessments
- 🏢 Authorized pentesting
- 📚 Security research
- 🎓 Educational purposes

### ❌ Do Not

- ⛔ Access systems without authorization
- ⛔ Use found credentials maliciously
- ⛔ Exploit vulnerabilities without permission
- ⛔ Share sensitive findings publicly

---

## 📁 Project Structure

```
Hardcoded-Token-Hunter/
├── manifest.json              # Extension config (Manifest V3)
├── background.js              # Service worker
├── content.js                 # Main content script
├── validator.js               # Token validation logic
├── deep-crawler.js            # JS file crawler
├── bucket-takeover-detector.js # S3 bucket scanner
├── token-scanner-worker.js    # Web worker for scanning
├── popup.html/js              # Extension popup
├── settings.html/js           # Settings page
├── history.html/js            # History dashboard
├── popup.css                  # Styles
└── icons/                     # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🎯 Example Findings

```
🔐 AWS Access Key Found!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Key: AKIA52XXXXXXXXXXXXXX
Source: https://target.com/app.bundle.js
Line: 1842
Status: ⚠️ Potentially Active

🪣 S3 Bucket Takeover Possible!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Bucket: company-assets-backup
Status: ❌ Does not exist
Risk: 🔴 Critical - Takeover possible!
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| No findings | Try Manual/Deep Scan mode |
| Extension not working | Check if Manifest V3 is supported |
| Discord not receiving | Verify webhook URL is correct |
| High false positives | Adjust sensitivity in settings |

---

## 📚 References

- [OWASP - Sensitive Data Exposure](https://owasp.org/www-project-web-security-testing-guide/)
- [AWS Security Best Practices](https://docs.aws.amazon.com/general/latest/gr/aws-security-best-practices.html)
- [GitHub Secret Scanning Patterns](https://docs.github.com/en/code-security/secret-scanning)

---

<div align="center">

## 🙏 Credits

**Developed by OFJAAAH**

[![Twitter](https://img.shields.io/badge/Follow-@ofjaaah-1DA1F2?style=flat-square&logo=twitter)](https://twitter.com/ofjaaah)
[![GitHub](https://img.shields.io/badge/GitHub-KingOfBugbounty-181717?style=flat-square&logo=github)](https://github.com/KingOfBugbounty)

---

<img src="https://img.shields.io/badge/Made%20with-JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black">
<img src="https://img.shields.io/badge/Made%20for-Bug%20Bounty-red?style=for-the-badge&logo=hackerone">

**⚠️ For authorized security testing only. Use responsibly!**

</div>
