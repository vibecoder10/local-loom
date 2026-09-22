import os

PROJ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "compositions")

modules = [
    {
        "id": "m1", "num": "M1", "section": "ANATOMY", "color": "#8b5cf6", "agent": "ROBO", "letter": "R",
        "title": "The <em>Anatomy</em> of an AI Agent",
        "purpose": "Tools change weekly. The mental model behind every AI agent doesn't. Get this right once and every new launch clicks.",
        "topics": [
            ("1.1", "The Mental Model", "Tools change weekly. The pattern doesn't."),
            ("1.2", "Chatbots vs Agents", "Chatbots explain. Agents do. The line is the loop."),
            ("1.3", "The Model", "An ultracompressor of the world's information."),
            ("1.4", "The Harness", "The wrapper around the model. The surface you touch."),
            ("1.5", "The Context", "Plain English instructions. CLAUDE.md, AGENT.md."),
            ("1.6", "Agentic Loop", "Look &middot; think &middot; act &middot; check &middot; repeat."),
        ]
    },
    {
        "id": "m2", "num": "M2", "section": "DEEP DIVE", "color": "#ff6b1a", "agent": "DEVO", "letter": "D",
        "title": "The Model, the Harness, and <em>Context</em>",
        "purpose": "Going deeper on the three parts. What each one does &mdash; and how they fit together.",
        "topics": [
            ("2.1", "The 6-Month Rule", "Build for what models will be soon."),
            ("2.2", "Model Tiers", "High &middot; mid &middot; low. When to switch."),
            ("2.3", "Tokens", "What the agent eats. ~4 chars each."),
            ("2.4", "Context Window", "Working memory. The overflow problem."),
            ("2.5", "Harness Surfaces", "Terminal &middot; desktop &middot; IDE &middot; messaging."),
            ("2.6", "CLAUDE.md &amp; AGENT.md", "The agent's job description. Pre-injected each session."),
        ]
    },
    {
        "id": "m3", "num": "M3", "section": "LANGUAGE", "color": "#22d3ee", "agent": "EDDO", "letter": "E",
        "title": "The <em>Language</em> of Agents",
        "purpose": "Demystify the jargon. Every term you'll see in docs, tweets, and tutorials &mdash; in plain English.",
        "topics": [
            ("3.1", "IDEs", "VS Code &middot; Cursor &middot; Antigravity."),
            ("3.2", "Permission Modes", "Auto &middot; Ask &middot; Plan &middot; Bypass."),
            ("3.4", "Effort", "How effort works. Token implications."),
            ("3.7", "Context Hygiene", "Token bloat. Pruning techniques."),
            ("3.11", "MCP Servers", "Gmail &middot; Drive &middot; Slack &middot; Linear."),
            ("3.13", "Routines", "How routines run. Cron syntax basics."),
        ]
    },
    {
        "id": "m4", "num": "M4", "section": "TECHNIQUES", "color": "#50e3c2", "agent": "COMO", "letter": "C",
        "title": "Core <em>Agentic</em> Techniques",
        "purpose": "Patterns that make agents actually useful. Platform-agnostic &mdash; work on any harness, any model.",
        "topics": [
            ("4.1", "Build Skills", "Skill anatomy. master-* prefix convention."),
            ("4.2", "Reverse Prompt", "Reverse-prompting explained. Sample prompts."),
            ("4.3", "Personalise", "Personalising CLAUDE.md. Voice &middot; stack &middot; workflow."),
            ("4.4", "Calibrate", "The /calibrate skill. End-of-session ritual."),
            ("4.5", "Burst", "The /burst command. Pick the winner."),
            ("4.6", "Align", "Cross-agent standards. SOUL &middot; workspace &middot; skills."),
        ]
    },
    {
        "id": "m5", "num": "M5", "section": "ORCHESTRATION", "color": "#f5a623", "agent": "BIZO", "letter": "B",
        "title": "Multi-Agent <em>Orchestration</em>",
        "purpose": "When one agent isn't enough. Coordination, sessions, channels &mdash; turning one agent into a team.",
        "topics": [
            ("5.1", "Session Continuity", "Convo logs. Handoffs."),
            ("5.2", "The Coordinator", "master-coord skill. Routing logic."),
            ("5.4", "Spawning Subagents", "How subagents work. The Task tool."),
            ("5.5", "Going Multi", "When to split. Why specialists win."),
            ("5.6", "SOUL.md", "Voice + tonality. When to use."),
            ("5.8", "24/7 Channels", "Telegram bots &middot; Discord. Push notifications."),
        ]
    },
    {
        "id": "m6", "num": "M6", "section": "COMMAND CENTRE", "color": "#f472b6", "agent": "ASTO", "letter": "A",
        "title": "Your AI <em>Command Centre</em>",
        "purpose": "Every agent. Full visibility. The dashboard layer nobody else teaches.",
        "topics": [
            ("6.1", "The Why", "Visibility at scale. The 3-agent threshold."),
            ("6.2", "The Dashboard", "Single-screen overview. Live agent state."),
            ("6.3", "Agent Statuses", "Idle &middot; working &middot; blocked. Live polling."),
            ("6.4", "Sprint &amp; Backlog", "The sprint board. The backlog queue."),
            ("6.5", "Generations", "Image &middot; video &middot; audio. Cost per gen."),
            ("6.6", "Docs", "Living markdown. Agent read + write."),
        ]
    },
]

template = '''<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Source+Serif+4:ital,wght@0,400;0,600;1,400;1,600&family=JetBrains+Mono:wght@400;500;700&display=block"
      rel="stylesheet"
    />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ background: transparent; overflow: hidden; }}
      body {{ width: 1920px; height: 1080px; font-family: "Outfit", sans-serif; }}

      [data-composition-id="{ID}"] {{
        width: 1920px; height: 1080px;
        background: #000;
        overflow: hidden;
        position: relative;
        font-family: "Outfit", sans-serif;
        --c: {COLOR};
      }}

      [data-composition-id="{ID}"] .ambient {{
        position: absolute; inset: 0;
        background:
          radial-gradient(900px at 20% 20%, color-mix(in oklab, {COLOR} 14%, transparent), transparent 60%),
          radial-gradient(700px at 80% 80%, rgba(255,107,26,0.05), transparent 60%);
        z-index: 1;
      }}

      [data-composition-id="{ID}"] .grid-overlay {{
        position: absolute; inset: 0;
        background-size: 60px 60px;
        background-image:
          linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px);
        mask-image: radial-gradient(ellipse at center, black 20%, transparent 80%);
        -webkit-mask-image: radial-gradient(ellipse at center, black 20%, transparent 80%);
        z-index: 2;
      }}

      [data-composition-id="{ID}"] .stage {{
        position: relative;
        width: 100%; height: 100%;
        padding: 100px 140px;
        display: flex; flex-direction: column;
        gap: 40px;
        z-index: 5;
      }}

      [data-composition-id="{ID}"] .head-row {{
        display: flex; align-items: flex-start; gap: 40px;
      }}

      [data-composition-id="{ID}"] .head-text {{ flex: 1; }}

      [data-composition-id="{ID}"] .kicker {{
        font-family: "JetBrains Mono", monospace;
        font-size: 16px;
        font-weight: 700;
        letter-spacing: 0.32em;
        color: var(--c);
        text-transform: uppercase;
        margin-bottom: 22px;
        display: inline-flex; align-items: center; gap: 14px;
        padding: 10px 22px;
        background: color-mix(in oklab, {COLOR} 10%, transparent);
        border: 1px solid color-mix(in oklab, {COLOR} 30%, transparent);
        border-radius: 100px;
      }}
      [data-composition-id="{ID}"] .kicker .num {{
        color: #fff;
        font-weight: 800;
        background: var(--c);
        padding: 2px 10px;
        border-radius: 4px;
      }}

      [data-composition-id="{ID}"] .heading {{
        font-family: "Source Serif 4", serif;
        font-weight: 400;
        font-size: 88px;
        line-height: 1.0;
        letter-spacing: -0.02em;
        color: #f1ece0;
      }}
      [data-composition-id="{ID}"] .heading em {{
        font-style: italic;
        color: var(--c);
      }}

      [data-composition-id="{ID}"] .purpose {{
        font-family: "Outfit", sans-serif;
        font-size: 22px;
        font-weight: 300;
        line-height: 1.45;
        color: rgba(255,255,255,0.6);
        margin-top: 22px;
        max-width: 800px;
      }}

      [data-composition-id="{ID}"] .agent-badge {{
        flex-shrink: 0;
        width: 140px; height: 158px;
        position: relative;
      }}
      [data-composition-id="{ID}"] .agent-badge .hex-shape {{
        width: 100%; height: 100%;
      }}
      [data-composition-id="{ID}"] .agent-badge .letter {{
        position: absolute;
        top: 48%; left: 50%;
        transform: translate(-50%, -50%);
        font-family: "Outfit", sans-serif;
        font-weight: 800;
        font-size: 64px;
        color: #fff;
        text-shadow: 0 0 24px color-mix(in oklab, {COLOR} 60%, transparent);
      }}
      [data-composition-id="{ID}"] .agent-badge .agent-name {{
        position: absolute;
        bottom: -28px; left: 50%;
        transform: translateX(-50%);
        font-family: "JetBrains Mono", monospace;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.22em;
        color: var(--c);
        text-transform: uppercase;
      }}

      [data-composition-id="{ID}"] .topics {{
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 22px;
        margin-top: 24px;
      }}

      [data-composition-id="{ID}"] .topic {{
        background: rgba(15,17,25,0.85);
        border: 1px solid rgba(46,50,68,0.6);
        border-radius: 16px;
        padding: 24px 26px;
        display: flex; flex-direction: column; gap: 10px;
        opacity: 0;
        transform: translateY(20px);
      }}
      [data-composition-id="{ID}"] .topic .t-head {{
        display: flex; align-items: baseline; gap: 12px;
      }}
      [data-composition-id="{ID}"] .topic .t-num {{
        font-family: "JetBrains Mono", monospace;
        font-size: 13px;
        font-weight: 700;
        color: var(--c);
        background: color-mix(in oklab, {COLOR} 14%, transparent);
        padding: 3px 9px;
        border-radius: 4px;
      }}
      [data-composition-id="{ID}"] .topic .t-title {{
        font-family: "Outfit", sans-serif;
        font-size: 22px;
        font-weight: 700;
        color: #fff;
        line-height: 1.2;
        letter-spacing: -0.01em;
      }}
      [data-composition-id="{ID}"] .topic .t-desc {{
        font-family: "Outfit", sans-serif;
        font-size: 16px;
        font-weight: 400;
        line-height: 1.45;
        color: rgba(255,255,255,0.55);
      }}
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="{ID}"
      data-width="1920"
      data-height="1080"
      data-start="0"
      data-duration="23"
    >
      <div class="ambient"></div>
      <div class="grid-overlay"></div>

      <div id="stage" class="stage">
        <div class="head-row">
          <div class="head-text">
            <div id="kicker" class="kicker">
              <span class="num">{NUM}</span> {SECTION}
            </div>
            <div id="heading" class="heading">{TITLE}</div>
            <div id="purpose" class="purpose">{PURPOSE}</div>
          </div>
          <div id="agent-badge" class="agent-badge">
            <svg class="hex-shape" viewBox="0 0 100 113" fill="none">
              <polygon points="50,3 95,28 95,85 50,110 5,85 5,28"
                fill="{COLOR}"
                fill-opacity="0.15"
                stroke="{COLOR}"
                stroke-width="2"
                style="filter: drop-shadow(0 0 30px color-mix(in oklab, {COLOR} 50%, transparent));"/>
            </svg>
            <div class="letter">{LETTER}</div>
            <div class="agent-name">{AGENT}</div>
          </div>
        </div>

        <div class="topics" id="topics">
{TOPIC_CARDS}
        </div>
      </div>
    </div>

    <script>
      window.__timelines = window.__timelines || {{}};
      var tl = gsap.timeline({{ paused: true }});

      var kicker = document.getElementById("kicker");
      var heading = document.getElementById("heading");
      var purpose = document.getElementById("purpose");
      var agentBadge = document.getElementById("agent-badge");
      var topics = document.querySelectorAll('[data-composition-id="{ID}"] .topic');
      var stage = document.getElementById("stage");

      tl.fromTo(kicker,
        {{ opacity: 0, y: -20, scale: 0.9 }},
        {{ opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.6)" }},
        0.2
      );

      tl.fromTo(heading,
        {{ opacity: 0, y: 30, filter: "blur(12px)" }},
        {{ opacity: 1, y: 0, filter: "blur(0px)", duration: 0.7, ease: "expo.out" }},
        0.5
      );

      tl.fromTo(purpose,
        {{ opacity: 0, y: 14 }},
        {{ opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }},
        1.0
      );

      tl.fromTo(agentBadge,
        {{ opacity: 0, x: 40, scale: 0.6, rotation: -15 }},
        {{ opacity: 1, x: 0, scale: 1, rotation: 0, duration: 0.7, ease: "back.out(1.5)" }},
        0.7
      );

      tl.to(topics, {{
        opacity: 1,
        y: 0,
        duration: 0.55,
        ease: "back.out(1.3)",
        stagger: 0.16
      }}, 1.4);

      // Highlight cards one by one (mid-scene activity)
      var highlightStart = 4.0;
      var highlightStep = 2.4;
      Array.prototype.forEach.call(topics, function (card, i) {{
        var t = highlightStart + i * highlightStep;
        tl.to(card, {{
          scale: 1.04,
          borderColor: "{COLOR}",
          duration: 0.35,
          ease: "power2.out"
        }}, t);
        tl.to(card, {{
          scale: 1,
          borderColor: "rgba(46,50,68,0.6)",
          duration: 0.35,
          ease: "power2.in"
        }}, t + 0.9);
      }});

      // Subtle agent breathe
      tl.to(agentBadge, {{ y: -8, duration: 1.5, yoyo: true, repeat: 6, ease: "sine.inOut" }}, 2.5);

      // Exit
      tl.to(stage, {{
        opacity: 0,
        y: -30,
        duration: 0.6,
        ease: "power2.in"
      }}, 22.0);

      tl.set(stage, {{ opacity: 0, visibility: "hidden" }}, 22.95);

      window.__timelines["{ID}"] = tl;
    </script>
  </body>
</html>
'''

def topic_card(num, title, desc):
    return '          <div class="topic">\n            <div class="t-head">\n              <span class="t-num">' + num + '</span>\n              <span class="t-title">' + title + '</span>\n            </div>\n            <div class="t-desc">' + desc + '</div>\n          </div>'

for m in modules:
    cards = "\n".join(topic_card(*t) for t in m["topics"])
    html = template.format(
        ID=m["id"],
        NUM=m["num"],
        SECTION=m["section"],
        COLOR=m["color"],
        AGENT=m["agent"],
        LETTER=m["letter"],
        TITLE=m["title"],
        PURPOSE=m["purpose"],
        TOPIC_CARDS=cards
    )
    out_path = os.path.join(PROJ, m["id"] + ".html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    print("Wrote", out_path, "(" + str(len(html)) + " chars)")

print("Done.")
