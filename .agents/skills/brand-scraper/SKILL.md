---
name: brand-scraper
description: "Extracts comprehensive brand identity and design system information from websites using FireCrawl API, including colors, typography, components, and generates markdown brand guidelines."
version: 1.0.0
author: Beast Dash Agent System
created: 2026-02-10
updated: 2026-02-10
platforms: [all]
category: web-scraping
tags: [branding, design-system, firecrawl, web-scraping, css, markdown]
risk: safe
---

# brand-scraper

## DO NOT USE WHEN
- The conversation mentions branding only in passing
- The task is about code styling or UI colour choices
- No actual competitor or brand research is being conducted

## Purpose

Extract comprehensive brand identity and design system information from any website using the FireCrawl API. This skill automates the process of analyzing a website's visual design, extracting colors, typography, spacing, components, and brand assets, then generating structured outputs including JSON data, CSS variables, and comprehensive markdown brand guidelines.

## When to Use This Skill

This skill should be used when:
- Analyzing competitor branding and design systems
- Building a new design system based on reference websites
- Creating brand guidelines documentation from existing websites
- Conducting design audits across brand touchpoints
- Onboarding clients by documenting their existing brand
- Building a library of inspiring brand references
- Extracting design tokens for implementation

## Core Capabilities

1. **Brand Data Extraction** - Scrapes comprehensive brand information using FireCrawl's branding format
2. **Multiple Export Formats** - Generates JSON, CSS variables, and markdown documentation
3. **Batch Processing** - Scrapes multiple websites with rate limiting
4. **Completeness Analysis** - Evaluates how much brand data was successfully extracted
5. **Visual Documentation** - Creates markdown with color previews and organized sections
6. **Design Token Generation** - Exports CSS custom properties for immediate use

## Prerequisites

### Required
- Python 3.8 or higher
- FireCrawl API key (get from [firecrawl.dev](https://firecrawl.dev))

### Installation
```bash
# Install dependencies
pip install firecrawl-py python-dotenv

# Configure API key in .env
echo "FIRECRAWL_API_KEY=fc-YOUR-API-KEY" >> .env
```

## Usage

### Basic Brand Extraction

Extract brand data from a single website:
```bash
python execution/scrape_brand_firecrawl.py --url "https://stripe.com"
```

**Output:** JSON file with brand data in `.tmp/brand_data/`

### Complete Extraction with All Outputs

Get JSON, CSS variables, and brand guidelines:
```bash
python execution/scrape_brand_firecrawl.py --url "https://linear.app" --screenshot --export-css --export-guidelines
```

**Outputs:**
- `brand_linear.app_*.json` - Raw brand data
- `brand_linear.app_variables.css` - CSS design tokens
- `brand_guidelines_linear.app.md` - Comprehensive brand guidelines
- Screenshot URL in JSON

### Batch Processing

Scrape multiple websites:
```bash
# Create URL list
echo "https://stripe.com" > urls.txt
echo "https://notion.so" >> urls.txt
echo "https://vercel.com" >> urls.txt

# Run batch scrape
python execution/scrape_brand_firecrawl.py --batch urls.txt --export-guidelines --delay 2
```

## Command-Line Options

| Option | Description |
|--------|-------------|
| `--url URL` | Single URL to scrape |
| `--batch FILE` | Text file with URLs (one per line) |
| `--screenshot` | Capture full-page screenshot |
| `--markdown` | Include page markdown content |
| `--export-css` | Generate CSS variables file |
| `--export-guidelines` | Generate brand guidelines markdown |
| `--output-dir DIR` | Custom output directory |
| `--delay SECONDS` | Delay between batch requests (default: 1) |

## Output Formats

### 1. JSON (Always Generated)

Complete brand data structure:
```json
{
  "url": "https://example.com",
  "scraped_at": "2026-02-10T17:00:00Z",
  "branding": {
    "colorScheme": "dark",
    "colors": { "primary": "#FF6B35", ... },
    "typography": { "fontFamilies": { ... }, ... },
    "components": { "buttonPrimary": { ... }, ... },
    "images": { "logo": "...", ... }
  },
  "completeness": {
    "percentage": 87.0,
    "missing_critical": []
  }
}
```

### 2. CSS Variables (Optional)

Design tokens for immediate integration:
```css
:root {
  --color-primary: #635BFF;
  --color-secondary: #0A2540;
  --font-primary: Camphor;
  --font-size-h1: 72px;
  --spacing-base: 8px;
}
```

### 3. Brand Guidelines Markdown (Optional)

Comprehensive documentation with:
- Table of contents
- Color palette with visual previews
- Typography specifications
- Spacing and layout details
- Component styles
- Brand assets
- Usage examples

## Extracted Data

### Colors
- Primary, secondary, accent colors
- Background and text colors
- Semantic colors (success, warning, error)
- Link colors

### Typography
- Font families (primary, heading, code)
- Font sizes (h1-h6, body, small)
- Font weights (light, regular, medium, bold)
- Line heights

### Spacing & Layout
- Base spacing unit
- Border radius
- Padding and margins
- Grid configuration
- Header/footer heights

### Components
- Button styles (primary, secondary)
- Input field styles
- Card styles
- Other UI components

### Brand Assets
- Logo URL
- Favicon
- OG image
- Hero images

### Brand Personality
- Tone (professional, playful, etc.)
- Energy level
- Target audience

## Architecture

This skill follows the 3-layer architecture:

**Layer 1: Directive** (`directives/scrape_brand_data.md`)
- Natural language instructions
- Input/output specifications
- Edge cases and troubleshooting
- Workflow documentation

**Layer 2: Orchestration** (AI Agent)
- Reads directive to understand requirements
- Calls execution script with appropriate parameters
- Handles errors and user communication
- Reports results

**Layer 3: Execution** (`execution/scrape_brand_firecrawl.py`)
- Deterministic Python script
- FireCrawl API integration
- Data processing and validation
- File generation (JSON, CSS, Markdown)

## Common Use Cases

### 1. Competitor Analysis
```bash
# Create competitor list
echo "https://competitor1.com" > competitors.txt
echo "https://competitor2.com" >> competitors.txt

# Extract all brand data
python execution/scrape_brand_firecrawl.py --batch competitors.txt --export-guidelines --delay 2

# Compare brand guidelines side-by-side
```

### 2. Design System Bootstrap
```bash
# Extract from reference site
python execution/scrape_brand_firecrawl.py --url "https://reference.com" --export-css --export-guidelines

# Copy to project
cp .tmp/brand_data/brand_reference.com_variables.css src/styles/tokens.css
cp .tmp/brand_data/brand_guidelines_reference.com.md docs/brand.md
```

### 3. Brand Reference Library
```bash
# Scrape inspiring brands
python execution/scrape_brand_firecrawl.py --batch inspiration.txt --export-guidelines

# Build a collection of brand guidelines for reference
```

## Error Handling

### API Key Not Found
**Error:** `FireCrawl API key not found`
**Solution:** Verify `.env` file exists and contains `FIRECRAWL_API_KEY=fc-YOUR-KEY`

### Rate Limit Exceeded
**Error:** `429 Too Many Requests`
**Solution:** 
- Wait 60 seconds and retry
- Increase `--delay` for batch operations
- Upgrade FireCrawl plan for higher limits

### Insufficient Brand Data
**Warning:** `Less than 50% of brand fields populated`
**Solution:**
- Some websites have limited brand information
- Try adding `--screenshot` to verify page loaded
- Check completeness percentage in output

### Network Errors
**Error:** `Unable to reach URL`
**Solution:**
- Verify URL is correct and accessible
- Check internet connection
- Ensure website is not blocking automated access

## Configuration

### Environment Variables

Required:
```bash
FIRECRAWL_API_KEY=fc-YOUR-API-KEY
```

Optional:
```bash
BRAND_SCRAPE_OUTPUT_DIR=.tmp/brand_data/
BRAND_SCRAPE_DOWNLOAD_IMAGES=true
BRAND_SCRAPE_MAX_IMAGE_SIZE_MB=10
```

## Performance

- **Single scrape:** ~5-10 seconds per website
- **Batch processing:** Respects rate limits with configurable delays
- **Caching:** FireCrawl caches results for 2 days by default
- **Success rate:** 85%+ for modern websites with clear branding

## Limitations

- Requires JavaScript-rendered content (handled by FireCrawl)
- Some websites may have incomplete brand data
- Rate limits apply based on FireCrawl plan
- Authentication-required sites need additional configuration

## Examples

See detailed examples in:
- `directives/examples/brand_scraper_stripe_example.md` - Complete walkthrough
- `directives/examples/brand_guidelines_stripe_example.md` - Sample output

## Files

```
directives/
├── scrape_brand_data.md              # Main directive
├── README_brand_scraper.md           # User documentation
└── examples/
    ├── brand_scraper_stripe_example.md
    └── brand_guidelines_stripe_example.md

execution/
└── scrape_brand_firecrawl.py         # Execution script

.env                                   # API configuration
```

## Version History

### 1.0.0 (2026-02-10)
- Initial release
- Brand data extraction via FireCrawl API
- JSON, CSS, and Markdown export formats
- Batch processing support
- Completeness analysis
- Comprehensive brand guidelines generation

## License

Part of the Beast Dash agent system.

## Support

For issues or questions:
1. Check the directive: `directives/scrape_brand_data.md`
2. Review examples in `directives/examples/`
3. Verify FireCrawl API status at [firecrawl.dev](https://firecrawl.dev)
