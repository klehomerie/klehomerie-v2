<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Klehomerie Insights Lab — RSS Directory</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 800px; margin: 60px auto; padding: 0 20px; background: #f8fafc; color: #1c1a3c; }
        .header { border-bottom: 3px solid #C66C54; padding-bottom: 24px; margin-bottom: 32px; }
        h1 { font-size: 2.25rem; font-weight: 800; margin: 0 0 8px 0; letter-tight: -0.025em; }
        .subtitle { color: #64748b; font-size: 1.125rem; margin: 0; }
        .alert-bar { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 14px 20px; border-radius: 8px; font-size: 0.875rem; margin-bottom: 32px; font-weight: 500; display: flex; align-items: center; gap: 8px; }
        .item { background: white; padding: 28px; border-radius: 12px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05); margin-bottom: 24px; border-left: 5px solid #C66C54; transition: transform 0.2s; }
        .item:hover { transform: translateY(-2px); }
        .item h2 { margin: 0 0 8px 0; font-size: 1.35rem; font-weight: 700; }
        .item a { color: #1c1a3c; text-decoration: none; }
        .item a:hover { color: #C66C54; text-decoration: underline; }
        .date { font-size: 0.8rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
        .desc { color: #475569; line-height: 1.6; margin: 0; font-size: 0.975rem; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Klehomerie Insights Lab Directory</h1>
        <p class="subtitle"><xsl:value-of select="rss/channel/description"/></p>
      </div>
      
      <div class="alert-bar">
        <span>🔬</span> 
        <span><strong>Automated Terminal Channel:</strong> This resource provides live operational XML configurations for automation networks (like LinkedIn). Below is a stylized human-readable interface.</span>
      </div>

      <div class="items">
        <xsl:for-each select="rss/channel/item">
          <div class="item">
            <div class="date"><xsl:value-of select="pubDate"/></div>
            <h2>
              <a href="{link}"><xsl:value-of select="title"/></a>
            </h2>
            <p class="desc"><xsl:value-of select="description"/></p>
          </div>
        </xsl:for-each>
      </div>
    </body>
    </html>
  </xsl:template>
</xsl:stylesheet>