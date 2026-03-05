# HuggingFace Authentication Setup Guide

## Overview
The IndicTrans2 translation model is hosted as a **gated repository** on HuggingFace. This means you need to:
1. Create a HuggingFace account
2. Request access to the model
3. Authenticate on your local machine

## Step-by-Step Instructions

### 1. Create a HuggingFace Account
1. Go to [https://huggingface.co/join](https://huggingface.co/join)
2. Sign up with your email or GitHub account
3. Verify your email address

### 2. Request Access to IndicTrans2 Model
1. Visit the IndicTrans2 English-Indic model page:
   * **English → Indian Languages**: [ai4bharat/indictrans2-en-indic-1B](https://huggingface.co/ai4bharat/indictrans2-en-indic-1B)
   * **Indian Languages → English**: [ai4bharat/indictrans2-indic-en-1B](https://huggingface.co/ai4bharat/indictrans2-indic-en-1B)

2. Click the **"Request Access"** or **"Agree and Access Repository"** button on each model page

3. You may need to:
   - Accept the terms of use
   - Provide basic information about your intended use
   - Wait for manual approval (usually instant to a few hours)

4. Check your email for approval notifications

### 3. Create a HuggingFace Access Token
1. Log in to [HuggingFace](https://huggingface.co/)
2. Go to your profile → **Settings** → **Access Tokens**
   * Direct link: [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
3. Click **"New token"**
4. Name your token (e.g., "lingolive-translation")
5. Select token type: **Read** (sufficient for downloading models)
6. Click **"Generate a token"**
7. **IMPORTANT**: Copy the token immediately - you won't be able to see it again!

### 4. Authenticate on Your Local Machine

#### Option A: Using HuggingFace CLI (Recommended)
```powershell
# Activate your virtual environment first
.venv\Scripts\activate

# Install huggingface-cli if not already installed
pip install --upgrade huggingface_hub

# Login to HuggingFace
huggingface-cli login
```

When prompted:
1. Paste your access token
2. Press Enter
3. Choose whether to store the token as a git credential (optional)

#### Option B: Manual Token Storage
Create a file at: `%USERPROFILE%\.huggingface\token`

**PowerShell:**
```powershell
# Create directory if it doesn't exist
New-Item -ItemType Directory -Force -Path $env:USERPROFILE\.huggingface

# Store your token (replace YOUR_TOKEN_HERE with actual token)
"YOUR_TOKEN_HERE" | Out-File -FilePath $env:USERPROFILE\.huggingface\token -NoNewline
```

#### Option C: Environment Variable (Temporary)
**PowerShell:**
```powershell
$env:HF_TOKEN = "YOUR_TOKEN_HERE"
```

**Note**: This is temporary and only lasts for the current session.

### 5. Verify Authentication

Run this test command:
```powershell
python -c "from huggingface_hub import whoami; print('Logged in as:', whoami()['name'])"
```

Expected output:
```
Logged in as: your-username
```

### 6. Test Model Access

```powershell
python -c "from transformers import AutoTokenizer; tokenizer = AutoTokenizer.from_pretrained('ai4bharat/indictrans2-en-indic-1B', trust_remote_code=True); print('✅ Model access granted!')"
```

If successful, you should see:
```
✅ Model access granted!
```

If you still see "401 Unauthorized" errors:
- Double-check you requested access to **both** model repositories
- Wait a few minutes for access approval to propagate
- Try logging out and back in: `huggingface-cli logout` then `huggingface-cli login`

### 7. Run the Test Suite Again

```powershell
cd C:\Users\Amit\LINGOLIVE\Lingolive-ai-integration\AI\lingolive_realtime
python test_speech_system.py
```

## Troubleshooting

### Error: "401 Unauthorized"
**Cause**: Not authenticated or access not granted
**Solution**: 
1. Verify you requested access to **both** IndicTrans2 repositories
2. Check your token has **Read** permissions
3. Regenerate token and login again

### Error: "Connection refused" or "Network error"
**Cause**: Firewall or proxy blocking HuggingFace
**Solution**:
1. Check your internet connection
2. Try disabling VPN temporarily
3. Configure proxy settings if behind corporate firewall

### Error: "Token not found"
**Cause**: Token file not created or wrong location
**Solution**:
```powershell
# Check if token file exists
Test-Path $env:USERPROFILE\.huggingface\token

# Verify token content (first 10 characters)
(Get-Content $env:USERPROFILE\.huggingface\token -Raw).Substring(0,10)
```

### Error: "Model not found"
**Cause**: Access not yet approved
**Solution**: Wait for approval email, then try again

## Security Best Practices

1. **Never commit tokens to git**
   - Add `.huggingface/` to your `.gitignore`
   - Use environment variables for CI/CD

2. **Use Read-only tokens** for downloading models
   - Only use Write tokens if publishing models

3. **Rotate tokens periodically**
   - Regenerate tokens every 6-12 months
   - Immediately revoke tokens if compromised

4. **Keep tokens private**
   - Don't share tokens with others
   - Don't paste tokens in chat rooms or forums

## Next Steps

After successful authentication:
1. Run the full test suite: `python test_speech_system.py`
2. All translation tests should now pass
3. Proceed with the TTS setup (see Python 3.14 compatibility note in main README)

## Additional Resources

- [HuggingFace Hub Documentation](https://huggingface.co/docs/hub/index)
- [HuggingFace Hub Python Client](https://huggingface.co/docs/huggingface_hub/index)
- [IndicTrans2 Model Card](https://huggingface.co/ai4bharat/indictrans2-en-indic-1B)
- [AI4Bharat Organization](https://huggingface.co/ai4bharat)

## Support

If you continue to have issues:
1. Check [HuggingFace Status Page](https://status.huggingface.co/)
2. Visit [HuggingFace Forums](https://discuss.huggingface.co/)
3. Contact IndicTrans2 maintainers on their repository page
