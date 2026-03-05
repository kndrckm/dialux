---
description: PowerShell and System Commands Rules
---

# PowerShell Command Rules
1. **Never use the `&&` operator** when running terminal commands. This user's PC is running a version of PowerShell where `&&` is not a valid argument (syntax error).
2. **Always use `;`** as the separator when chaining multiple commands together instead of `&&`. Example: `git add . ; git commit -m "update" ; git push`
