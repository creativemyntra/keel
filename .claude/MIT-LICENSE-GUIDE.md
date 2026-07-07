# MIT License Guide for Keel Framework

**Complete guide on MIT License: what it is, why we chose it, and how to use it**

---

## What is MIT License?

The **MIT License** is one of the most popular open-source licenses. It's:
- ✅ **Permissive** - Allows commercial use, modification, distribution
- ✅ **Simple** - Only 11 lines, easy to understand
- ✅ **Flexible** - Can combine with other open-source licenses
- ✅ **Free** - No cost to use or distribute

---

## MIT License Text (Official)

```
MIT License

Copyright (c) 2026 Amar Singh, Creative Myntra

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## What MIT License Allows (What Users Can Do)

### ✅ Commercial Use
Users can use Keel in **commercial products** and make **money** from it.

**Example:**
```
Company creates a SaaS product using Keel
→ Can charge customers for the SaaS
→ Can sell to enterprises
→ Can make profit
```

### ✅ Modification
Users can **modify, improve, or customize** Keel.

**Example:**
```
Developer modifies Keel for their specific needs
→ Can remove features not needed
→ Can add custom features
→ Can optimize for their use case
```

### ✅ Distribution
Users can **redistribute** modified versions of Keel.

**Example:**
```
Developer improves Keel
→ Can distribute improved version
→ Can create derivative products
→ Can share with others
```

### ✅ Private Use
Users can use Keel **privately** without sharing code.

**Example:**
```
Company uses Keel internally
→ No requirement to share modifications
→ Can keep source code private
→ No obligation to contribute back
```

### ✅ Sublicense
Users can **sublicense** Keel to others (with conditions).

**Example:**
```
Company integrates Keel into product
→ Can include Keel in product license
→ Can distribute to customers
→ Must include MIT license in distribution
```

---

## What MIT License Requires (What Users Must Do)

### 📋 Include Copyright Notice
Users **must include** the MIT license text and copyright notice.

**In distributed software:**
```
✅ Attach LICENSE file
✅ Include copyright header in code
✅ Document original author
```

### ⚖️ Include License Text
Users **must include** the full MIT license text.

**Where to put it:**
```
/
├── LICENSE (main file)
├── README.md (reference license)
├── package.json (reference license)
└── src/
    └── main.php (optional: header comment)
```

### No Liability
Users **cannot hold Keel creators liable** for issues.

**What this means:**
- If Keel breaks their code → They can't sue us
- If Keel causes data loss → We're not liable
- If security issue occurs → We're not responsible
- **BUT:** Good faith support is still provided

---

## What MIT License Does NOT Allow

### ❌ Trademark Use
Users **cannot use our trademark or brand name** to imply endorsement.

**Examples:**
```
❌ "Keel-powered enterprise solution" (implies endorsement)
❌ Using Keel logo without permission
❌ Claiming we endorse their product

✅ "Built with Keel framework"
✅ "Uses the Keel AI-SDLC framework"
✅ Honest attribution without trademark
```

### ❌ Liability Claims
Users **cannot claim we're liable** for their use.

**Examples:**
```
❌ "Keel caused our system failure" (lawsuit)
✅ "Keel had a bug, we found a workaround"
```

### ❌ Removing License/Copyright
Users **must keep** the license and copyright notice.

**Examples:**
```
❌ Remove LICENSE file
❌ Remove copyright headers
❌ Claim they wrote the original code

✅ Keep all license text
✅ Include full copyright notice
✅ Acknowledge original author
```

---

## How to Implement MIT License in Keel

### Step 1: Create LICENSE File ✅ (DONE)

**File location:** `/LICENSE` (root of repo)

**Content:**
```
MIT License

Copyright (c) 2026 Amar Singh, Creative Myntra

[Full MIT license text]
```

✅ Already created in Keel repo

---

### Step 2: Add License Reference to README.md

**Add to bottom of README:**

```markdown
## License

Keel is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### What you can do:
- ✅ Use commercially
- ✅ Modify and improve
- ✅ Distribute modified versions
- ✅ Use privately

### What you must do:
- 📋 Include LICENSE file
- 📋 Include copyright notice
- ⚖️ Cannot hold us liable

### What you cannot do:
- ❌ Claim we endorse your product
- ❌ Remove license text
```

---

### Step 3: Add to package.json (for npm)

```json
{
  "name": "@creativemyntra/keel",
  "version": "2.1.0",
  "license": "MIT",
  "author": "Amar Singh <creativemyntra@gmail.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/creativemyntra/keel.git"
  }
}
```

---

### Step 4: Add Header Comments to Source Files (Optional but Recommended)

**In main files (PHP, JavaScript, etc.):**

```php
<?php
/**
 * Keel AI-SDLC Framework
 *
 * Copyright (c) 2026 Amar Singh, Creative Myntra
 * Licensed under the MIT License
 * See LICENSE file in repository root for details.
 * 
 * @package Keel
 * @license MIT
 */

namespace Keel;

class SubscriptionService {
    // ...
}
```

---

### Step 5: Add to GitHub Repository Settings

**GitHub automatically detects LICENSE file and shows:**
- License badge
- License information on repo page
- License in API responses

**URL:** https://github.com/creativemyntra/keel
- Shows "MIT License" on main page ✅

---

## MIT License vs. Other Licenses

| License | Commercial | Modify | Distribute | Sublicense | Permissive |
|---------|-----------|--------|-----------|-----------|-----------|
| **MIT** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅✅✅ MOST |
| Apache 2.0 | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅✅ |
| GPL v3 | ✅ Yes | ✅ Yes | ✅ Yes (must open-source) | ⚠️ Conditional | ❌ RESTRICTIVE |
| BSD 3-Clause | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅✅✅ MOST |
| Proprietary | ❌ No | ❌ No | ❌ No | ❌ No | ❌❌❌ NONE |

**Why MIT for Keel?**
- ✅ Most permissive (maximum adoption)
- ✅ Simple and clear
- ✅ No copyleft restrictions
- ✅ Compatible with commercial use
- ✅ Popular in open source community

---

## How Users Must License Their Work

### Example: Company Uses Keel in Commercial Product

**What they MUST do:**

```markdown
# MyCompany SaaS Product

## License

This product uses the Keel AI-SDLC Framework, which is licensed under the MIT License.

See [Keel License](https://github.com/creativemyntra/keel/blob/master/LICENSE)

### Keel Framework Attribution

Keel AI-SDLC Framework
Copyright (c) 2026 Amar Singh, Creative Myntra
Licensed under the MIT License
```

**Their code can be:**
- ✅ Proprietary (they don't need to open-source)
- ✅ Different license (Apache, GPL, Proprietary)
- ✅ Commercial (charge customers)
- ✅ Private (internal only)

**But they MUST:**
- 📋 Include Keel LICENSE file
- 📋 Include copyright notice
- 📋 Acknowledge Keel author

---

## Real-World Examples

### Example 1: SaaS Company

```
Company: TechCorp
Product: AI Development Platform (built with Keel)
Users: 10,000 paying customers

✅ Legal because:
  - Keel is MIT licensed
  - TechCorp includes LICENSE file
  - TechCorp acknowledges Keel
  - TechCorp can charge for product
  - TechCorp can modify Keel
  - TechCorp doesn't need to open-source

Their code can be:
  - Proprietary
  - Closed-source
  - For-profit
  - Any license they choose
```

### Example 2: Developer Using Keel

```
Developer: Alice
Project: Personal website generator (uses Keel)

✅ Legal because:
  - Includes LICENSE file
  - Attributes Keel
  - Uses MIT license

Can be:
  - Open-source (with any license)
  - Closed-source
  - Commercial
  - Free
  - Personal use only
```

### Example 3: Contribution Back

```
Developer: Bob
Action: Improves Keel and contributes back

✅ Legal because:
  - MIT allows modification
  - MIT allows distribution
  - Can contribute under same MIT license
  - No restriction on contributing back

Process:
  1. Fork Keel (own copy)
  2. Improve code
  3. Submit pull request
  4. We review and merge
  5. Improvement added to main Keel
  6. Everyone benefits
```

---

## MIT License File Checklist

### ✅ In Keel Repository

- ✅ LICENSE file in root directory
- ✅ Copyright holder: Amar Singh, Creative Myntra
- ✅ Year: 2026
- ✅ Full MIT license text
- ✅ GitHub detects and shows license

### ✅ In Documentation

- ⏳ Add license section to README.md (needs update)
- ⏳ Add to package.json (needs npm setup)
- ⏳ Add to action.yml (optional)

### ✅ For Distribution

- ✅ GitHub Marketplace → Shows license
- ⏳ npm → license field in package.json
- ⏳ Docker → Include LICENSE in image

---

## How to Update README.md

```bash
# Add to README.md

## License

Keel AI-SDLC Framework is licensed under the **MIT License**.

### What This Means

You can:
- ✅ Use Keel commercially
- ✅ Modify and distribute
- ✅ Use in private projects
- ✅ Sublicense

You must:
- 📋 Include the LICENSE file
- 📋 Include copyright notice

You cannot:
- ❌ Claim we endorse your product
- ❌ Remove license notices

### Full License

See [LICENSE](LICENSE) file for complete terms.

---

**Copyright © 2026 Amar Singh, Creative Myntra**
```

---

## FAQ

### Q: Can someone use Keel in a closed-source product?
**A:** Yes! MIT allows closed-source use. They just need to include the LICENSE file and copyright notice.

### Q: Can someone charge money for a product using Keel?
**A:** Yes! MIT allows commercial use. They can charge customers while Keel remains free.

### Q: Do they have to contribute back improvements?
**A:** No. MIT doesn't require it (unlike GPL). But you can accept contributions voluntarily.

### Q: Can they remove the MIT license?
**A:** No. MIT license requires keeping the LICENSE file and copyright notice.

### Q: What if they don't follow the license?
**A:** 
- They violate copyright law
- We can take legal action
- But MIT is permissive, so most violations are honest mistakes
- Educate them on proper attribution

### Q: Is MIT compatible with other licenses?
**A:** Yes! MIT is one of the most compatible licenses. Can be combined with:
- ✅ Apache 2.0
- ✅ GPL (project becomes GPL)
- ✅ BSD
- ✅ Other permissive licenses

### Q: Can we change the license later?
**A:** Difficult. Once released under MIT:
- ✅ Can add additional license options
- ✅ Can relicense new versions
- ✅ BUT existing versions stay MIT forever
- Better to commit to MIT long-term

### Q: Should we add a CLA (Contributor License Agreement)?
**A:** Optional. MIT doesn't require it, but can help:
- Protect against contributor disputes
- Allow future re-licensing
- Simplify legal matters

---

## Implementation Checklist

### ✅ Phase 1: Core (DONE)
- ✅ Create LICENSE file in repo root
- ✅ GitHub detects license automatically
- ✅ License shows on GitHub repo page

### ⏳ Phase 2: Documentation (TODO)
- [ ] Update README.md with license section
- [ ] Add copyright header to main files
- [ ] Add license to package.json
- [ ] Add license reference to action.yml

### ⏳ Phase 3: Distribution
- [ ] GitHub Marketplace → license shown automatically
- [ ] npm registry → license field populated
- [ ] Docker Hub → LICENSE file in image
- [ ] GitHub Release → Include LICENSE in release

### ⏳ Phase 4: Enforcement
- [ ] Monitor for license violations
- [ ] Respond to attribution questions
- [ ] Accept contributions under MIT
- [ ] Consider CLA for major contributors

---

## Next Steps

```bash
# 1. Verify LICENSE file exists
ls -la LICENSE

# 2. Update README.md
# (Add license section from template above)

# 3. Commit and push
git add LICENSE
git commit -m "Add MIT License"
git push origin master

# 4. Verify on GitHub
# https://github.com/creativemyntra/keel
# Should show "MIT License" on repo page
```

---

## Resources

- **MIT License Official:** https://opensource.org/licenses/MIT
- **GitHub License Guide:** https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository
- **SPDX License List:** https://spdx.org/licenses/MIT
- **Choose a License:** https://choosealicense.com/licenses/mit/

---

**Status:** ✅ MIT License implemented and ready for distribution

**Next:** Update README.md and push to complete licensing setup
