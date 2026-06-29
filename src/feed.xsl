<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Klehomerie Insights Lab — RSS Directory</title>
      <style>
        /* 1. Light Theme Token Architecture (Default Base) */
        :root {
          --bg-color: #f8fafc;
          --text-color: #475569;
          --title-color: #1c1a3c;
          --card-bg: #ffffff;
          --border-color: #e2e8f0;
          --alert-bg: #eff6ff;
          --alert-border: #bfdbfe;
          --alert-text: #1e40af;
          --accent-color: #C66C54;
        }

        /* 2. Branded Dark Theme Extensions (Matches your site framework) */
        body.dark-theme {
          --bg-color: #0f172a;
          --text-color: #94a3b8;
          --title-color: #f8fafc;
          --card-bg: #1e293b;
          --border-color: #334155;
          --alert-bg: #1e293b;
          --alert-border: #334155;
          --alert-text: #38bdf8;
        }

        body { 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
          max-width: 800px; 
          margin: 60px auto; 
          padding: 0 20px; 
          background: var(--bg-color); 
          color: var(--text-color);
          transition: background-color 0.2s, color 0.2s;
        }
        .header { border-bottom: 3px solid var(--accent-color); padding-bottom: 24px; margin-bottom: 32px; }
        h1 { font-size: 2.25rem; font-weight: 800; margin: 0 0 8px 0; color: var(--title-color); tracking-tight: -0.025em; }
        .subtitle { color: var(--text-color); font-size: 1.125rem; margin: 0; }
        .alert-bar { background: var(--alert-bg); border: 1px solid var(--alert-border); color: var(--alert-text); padding: 14px 20px; border-radius: 8px; font-size: 0.875rem; margin-bottom: 32px; font-weight: 500; display: flex; align-items: center; gap: 8px; }
        .item { background: var(--card-bg); padding: 28px; border-radius: 12px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05); margin-bottom: 24px; border-left: 5px solid var(--accent-color); border-top: 1px solid var(--border-color); border-right: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); transition: transform 0.2s; }
        .item:hover { transform: translateY(-2px); }
        .item h2 { margin: 0 0 8px 0; font-size: 1.35rem; font-weight: 700; }
        .item a { color: var(--title-color); text-decoration: none; }
        .item a:hover { color: var(--accent-color); text-decoration: underline; }
        .date { font-size: 0.8rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
        .desc { color: var(--text-color); line-height: 1.6; margin: 0; font-size: 0.975rem; }
      </style>
      
      <script>
        document.addEventListener("DOMContentLoaded", function() {
          const savedTheme = localStorage.getItem("theme");
          const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          
          if (savedTheme === "dark" || (!savedTheme &amp;&amp; systemPrefersDark)) {
            document.body.classList.add("dark-theme");
          }
        });
      </script>
    </head>
    <body>
      <div class="header">
        <h1>Klehomerie Insights Lab Directory</h1>
        <p class="subtitle"><xsl:value-of select="rss/channel/description" disable-output-escaping="yes"/></p>
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
              <a href="{link}"><xsl:value-of select="title" disable-output-escaping="yes"/></a>
            </h2>
            <p class="desc"><xsl:value-of select="description" disable-output-escaping="yes"/></p>
          </div>
        </xsl:for-each>
      </div>
    </body>
    </html>
  </xsl:template>
</xsl:stylesheet>