{
  "brand": {
    "name": "HarborRent (working name)",
    "attributes": [
      "trustworthy",
      "calmly-technical",
      "high-clarity for dense data",
      "quietly premium (soft surfaces, crisp type)",
      "operational (workflows first)"
    ],
    "visual_style": {
      "fusion_inspiration": [
        "Swiss-style information hierarchy (tight labels, strong grid)",
        "Bento dashboard cards (modern SaaS)",
        "Soft paper + subtle grain (not flat)",
        "Light, warm-neutral canvas with teal/sage operational accents"
      ],
      "do_not": [
        "Do not use purple in the UI.",
        "Do not create centered page layouts; keep natural left-aligned reading flow.",
        "Avoid 'spreadsheet gray' monotony; use gentle surface contrast and semantic tints.",
        "Avoid dense tables without progressive disclosure (column chooser / details drawer)."
      ]
    }
  },
  "typography": {
    "font_pairing": {
      "headings": {
        "family": "Space Grotesk",
        "fallback": "ui-sans-serif, system-ui",
        "weights": [600, 700],
        "usage": "Page titles, KPI numbers, card titles"
      },
      "body": {
        "family": "Work Sans",
        "fallback": "ui-sans-serif, system-ui",
        "weights": [400, 500, 600],
        "usage": "Tables, forms, helper text, navigation"
      }
    },
    "scale_tailwind": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight",
      "h2": "text-base md:text-lg font-medium text-muted-foreground",
      "section_title": "text-lg font-semibold tracking-tight",
      "kpi": "text-3xl sm:text-4xl font-semibold tabular-nums",
      "table": {
        "header": "text-xs font-semibold uppercase tracking-wide",
        "cell": "text-sm",
        "meta": "text-xs text-muted-foreground"
      }
    },
    "numbers": {
      "rule": "Use tabular numbers for rent, income, occupancy %, vacancy days.",
      "tailwind": "tabular-nums"
    }
  },
  "color_system": {
    "notes": [
      "Light-first, professional; semantic tints for statuses and overlays.",
      "No dark/saturated gradients; gradients only as subtle section accents (<=20% viewport)."
    ],
    "tokens_css": {
      "where": "/app/frontend/src/index.css (replace :root vars)",
      "css": ":root {\n  --background: 36 33% 98%; /* warm paper */\n  --foreground: 220 18% 14%; /* ink */\n\n  --card: 0 0% 100%;\n  --card-foreground: 220 18% 14%;\n  --popover: 0 0% 100%;\n  --popover-foreground: 220 18% 14%;\n\n  --primary: 176 40% 28%; /* harbor teal */\n  --primary-foreground: 0 0% 98%;\n\n  --secondary: 36 18% 94%; /* warm mist */\n  --secondary-foreground: 220 18% 18%;\n\n  --muted: 36 16% 92%;\n  --muted-foreground: 220 8% 42%;\n\n  --accent: 168 35% 90%; /* sage tint */\n  --accent-foreground: 176 40% 20%;\n\n  --border: 220 14% 88%;\n  --input: 220 14% 88%;\n  --ring: 176 45% 30%;\n\n  --destructive: 0 74% 50%;\n  --destructive-foreground: 0 0% 98%;\n\n  --radius: 0.75rem;\n\n  /* Charts */\n  --chart-1: 176 45% 34%;\n  --chart-2: 146 33% 38%;\n  --chart-3: 28 70% 52%;\n  --chart-4: 210 45% 46%;\n  --chart-5: 40 75% 55%;\n}\n\n.dark {\n  --background: 220 18% 10%;\n  --foreground: 0 0% 98%;\n  --card: 220 18% 12%;\n  --card-foreground: 0 0% 98%;\n  --popover: 220 18% 12%;\n  --popover-foreground: 0 0% 98%;\n  --primary: 168 55% 45%;\n  --primary-foreground: 220 18% 10%;\n  --secondary: 220 14% 18%;\n  --secondary-foreground: 0 0% 98%;\n  --muted: 220 14% 18%;\n  --muted-foreground: 220 8% 70%;\n  --accent: 176 30% 18%;\n  --accent-foreground: 0 0% 98%;\n  --border: 220 14% 20%;\n  --input: 220 14% 20%;\n  --ring: 168 55% 45%;\n }"
    },
    "semantic": {
      "status": {
        "occupied": { "bg": "bg-emerald-50", "text": "text-emerald-900", "border": "border-emerald-200" },
        "vacant": { "bg": "bg-slate-50", "text": "text-slate-900", "border": "border-slate-200" },
        "turnover": { "bg": "bg-amber-50", "text": "text-amber-900", "border": "border-amber-200" },
        "airbnb": { "bg": "bg-sky-50", "text": "text-sky-900", "border": "border-sky-200" }
      },
      "leads_strength": {
        "weak": { "row": "bg-red-50/60", "left_bar": "bg-red-500", "text": "text-red-900" },
        "fair": { "row": "bg-orange-50/70", "left_bar": "bg-orange-500", "text": "text-orange-900" },
        "good": { "row": "bg-yellow-50/70", "left_bar": "bg-yellow-500", "text": "text-yellow-900" },
        "strong": { "row": "bg-emerald-50/70", "left_bar": "bg-emerald-500", "text": "text-emerald-900" }
      },
      "notification": {
        "info": "bg-sky-50 text-sky-900 border-sky-200",
        "warning": "bg-amber-50 text-amber-900 border-amber-200",
        "danger": "bg-red-50 text-red-900 border-red-200",
        "success": "bg-emerald-50 text-emerald-900 border-emerald-200"
      }
    },
    "gradients": {
      "allowed_usage": [
        "Only on hero/top header strip background or page header band (max ~160px height)",
        "Decorative overlays behind cards (very low opacity)",
        "Never behind dense tables or long text"
      ],
      "recipes_tailwind": [
        "bg-[radial-gradient(60%_60%_at_10%_0%,rgba(45,148,140,0.18)_0%,rgba(45,148,140,0)_60%),radial-gradient(60%_60%_at_90%_10%,rgba(157,214,199,0.20)_0%,rgba(157,214,199,0)_55%)]",
        "bg-[linear-gradient(120deg,rgba(45,148,140,0.14)_0%,rgba(249,247,242,0.0)_55%)]"
      ]
    }
  },
  "layout_grid": {
    "app_shell": {
      "pattern": "Sidebar + top bar, content area with sticky page header",
      "sidebar": {
        "width": "w-[272px] (desktop), collapsible to icons-only w-[72px]",
        "mobile": "Use Sheet (slide-over) for nav",
        "tailwind": "bg-card border-r border-border/70"
      },
      "content": {
        "max_width": "max-w-[1400px] for wide tables, but do not hard-center; use px gutters",
        "gutters": "px-4 sm:px-6 lg:px-8",
        "vertical_rhythm": "space-y-6 (pages), cards use space-y-4"
      }
    },
    "page_header": {
      "structure": "Title left, actions right; secondary row for filters/search + view toggles",
      "sticky": "sticky top-0 with backdrop blur",
      "tailwind": "sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/60"
    },
    "bento_cards": {
      "usage": "Income/Vacancy overview KPI cards and quick insights",
      "grid": "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
    }
  },
  "components": {
    "component_path": {
      "button": "/app/frontend/src/components/ui/button.jsx",
      "card": "/app/frontend/src/components/ui/card.jsx",
      "table": "/app/frontend/src/components/ui/table.jsx",
      "dialog": "/app/frontend/src/components/ui/dialog.jsx",
      "drawer": "/app/frontend/src/components/ui/drawer.jsx",
      "sheet": "/app/frontend/src/components/ui/sheet.jsx",
      "tabs": "/app/frontend/src/components/ui/tabs.jsx",
      "select": "/app/frontend/src/components/ui/select.jsx",
      "input": "/app/frontend/src/components/ui/input.jsx",
      "textarea": "/app/frontend/src/components/ui/textarea.jsx",
      "switch": "/app/frontend/src/components/ui/switch.jsx",
      "badge": "/app/frontend/src/components/ui/badge.jsx",
      "progress": "/app/frontend/src/components/ui/progress.jsx",
      "calendar": "/app/frontend/src/components/ui/calendar.jsx",
      "scroll_area": "/app/frontend/src/components/ui/scroll-area.jsx",
      "popover": "/app/frontend/src/components/ui/popover.jsx",
      "tooltip": "/app/frontend/src/components/ui/tooltip.jsx",
      "breadcrumb": "/app/frontend/src/components/ui/breadcrumb.jsx",
      "sonner_toasts": "/app/frontend/src/components/ui/sonner.jsx"
    },
    "navigation": {
      "sidebar_nav": {
        "pattern": "Icon + label, active pill highlight, group headings",
        "active": "bg-accent text-accent-foreground shadow-sm",
        "hover": "hover:bg-muted/60",
        "item_tailwind": "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
        "data_testid": {
          "nav_properties": "sidebar-nav-properties",
          "nav_units": "sidebar-nav-units",
          "nav_tenants": "sidebar-nav-tenants",
          "nav_income": "sidebar-nav-income",
          "nav_vacancies": "sidebar-nav-vacancies",
          "nav_leads": "sidebar-nav-leads",
          "nav_calendar": "sidebar-nav-calendar",
          "nav_notifications": "topbar-notifications-button",
          "nav_features": "sidebar-nav-features"
        }
      },
      "topbar": {
        "includes": [
          "global property switcher (Select)",
          "global search (Command palette optional)",
          "notification bell (opens side sheet)",
          "year picker on pages that need it"
        ]
      }
    },
    "data_tables": {
      "principles": [
        "Default to comfortable density (not cramped).",
        "Freeze primary column (name) via sticky cell patterns if needed.",
        "Use row actions as a trailing kebab menu (DropdownMenu).",
        "Progressive disclosure: open Drawer for details/edit rather than navigating away, where possible."
      ],
      "table_styles": {
        "header": "bg-muted/50",
        "row_hover": "hover:bg-muted/40",
        "zebra": "odd:bg-card even:bg-muted/20",
        "tailwind": "rounded-xl border border-border/70 overflow-hidden"
      },
      "empty_state": {
        "pattern": "Card with illustration thumbnail + short CTA",
        "cta": "Button variant=default, label e.g. 'Add property'"
      }
    },
    "forms": {
      "patterns": [
        "Use Form (react-hook-form shadcn) with Label, Input, Select, Textarea.",
        "Inline validation text below field in text-xs text-destructive.",
        "Use helper text for complex date logic (same-day turnover, overlap rules)."
      ],
      "repeatable_cost_fields": {
        "pattern": "Costs as a mini-table inside a Card: rows with (label, amount, frequency, delete).",
        "controls": "Add row button + inline remove icon button",
        "micro_interaction": "New row slides in (Framer Motion) and autofocus label"
      },
      "airbnb_toggle": {
        "pattern": "Switch with inline label; when on, reveal extra fields (platform, nightly rate, cleaning fee).",
        "animation": "Height+opacity transition on the conditional section (no transition:all)."
      }
    },
    "leads": {
      "list": {
        "row_coding": "Strength color row + left border bar for quick scan.",
        "stage_chip": "Badge with stage number, neutral background; use Progress bar on detail page.",
        "row_tailwind": "relative pl-3 before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:rounded-l-xl"
      },
      "stage_progression": {
        "component": "Stepper-like UI using Tabs or a horizontal list with 8 steps",
        "behavior": "Click stage -> update lead + trigger notification toast + add notification item",
        "data_testid": {
          "stage_button": "lead-stage-set-button",
          "lead_row": "leads-table-row"
        }
      }
    },
    "income": {
      "expandable_breakdown": {
        "component": "Collapsible + nested Table",
        "pattern": "Month row -> expand to properties -> expand to units -> show tenant lines",
        "kpi_cards": "Total income, long-term income, Airbnb income, outstanding"
      }
    },
    "vacancies": {
      "breakdowns": {
        "by_building": "Cards with occupancy %, vacant units, upcoming vacancy count",
        "by_unit_size": "Bar chart (Recharts) + table",
        "upcoming": "List with date chips (Badge) and quick action to create lead"
      }
    },
    "calendar_12_month": {
      "layout": {
        "structure": "12 months as 3x4 grid on desktop, 1x12 scroll on mobile",
        "month_card": "Card with mini month grid; legend above",
        "tailwind": "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      },
      "day_cells": {
        "occupied": "bg-emerald-100 text-emerald-950",
        "vacant": "bg-slate-100 text-slate-800",
        "lead_overlay": "ring-2 ring-amber-300/70 bg-amber-50/30",
        "turnover_day": "bg-amber-200"
      },
      "interaction": [
        "Hover day: Tooltip shows tenant/lead and amount (if relevant).",
        "Click day: Popover with actions (View tenant, Create lead, Block dates).",
        "Scroll year: subtle animated count-up and grid crossfade (Framer Motion)."
      ],
      "legend": {
        "pattern": "Small inline legend chips",
        "tailwind": "flex flex-wrap gap-2 text-xs"
      }
    },
    "notifications_panel": {
      "component": "Sheet (right side)",
      "trigger": "Bell icon in topbar",
      "content": "Tabs: All / Leads / System; each item is a compact Card row",
      "micro_interaction": "New notification pulses once (ring + background fade).",
      "data_testid": {
        "panel": "notifications-panel",
        "item": "notifications-item",
        "close": "notifications-close-button"
      }
    }
  },
  "motion": {
    "library": {
      "recommend": "framer-motion",
      "install": "npm i framer-motion",
      "use_cases": [
        "Drawer/Sheet content entrance",
        "Expandable rows (Income) with height animation",
        "Calendar year transitions",
        "List item insertion/removal for repeatable costs"
      ]
    },
    "principles": {
      "durations": {
        "fast": "120-160ms",
        "base": "180-240ms",
        "slow": "280-360ms"
      },
      "easing": "cubic-bezier(0.2, 0.8, 0.2, 1)",
      "hover": [
        "Buttons: translate-y-[-1px] shadow increase",
        "Cards: border color + subtle lift",
        "Table rows: background tint only (no layout shift)"
      ],
      "no_universal_transition": "Never use transition: all. Use transition-colors, transition-shadow, transition-opacity."
    }
  },
  "icons": {
    "library": "lucide-react",
    "usage": "Sidebar icons, bell, kebab menus, calendar, building, users, banknote"
  },
  "data_visualization": {
    "library": {
      "recommend": "recharts",
      "install": "npm i recharts",
      "use_cases": [
        "Vacancy by unit size",
        "Income by month (sparkline / area)",
        "Occupancy percentage trend"
      ]
    },
    "chart_style": {
      "grid": "stroke: hsl(var(--border)) with opacity 0.6",
      "axes": "tick font Work Sans text-xs fill hsl(var(--muted-foreground))",
      "series": [
        "primary line: hsl(var(--chart-1))",
        "secondary: hsl(var(--chart-2))",
        "warning: hsl(var(--chart-3))"
      ],
      "tooltip": "Use shadcn Tooltip/Popover-like styling: bg-card border border-border rounded-lg px-3 py-2 text-sm"
    }
  },
  "accessibility": {
    "requirements": [
      "WCAG AA contrast for text on tinted rows and badges.",
      "Visible focus rings: ring-2 ring-[hsl(var(--ring))] ring-offset-2 ring-offset-background.",
      "Large hit targets: min-h-10 for icon buttons; min-h-11 for primary CTAs on mobile.",
      "Calendar: provide textual legend and tooltip content for color meaning; do not rely on color alone."
    ]
  },
  "testing_attributes": {
    "rule": "All interactive + key informational elements MUST include data-testid in kebab-case.",
    "examples": [
      "data-testid=\"properties-create-button\"",
      "data-testid=\"units-costs-add-row-button\"",
      "data-testid=\"tenants-airbnb-toggle\"",
      "data-testid=\"income-month-row-toggle\"",
      "data-testid=\"calendar-year-prev-button\"",
      "data-testid=\"calendar-day-cell\"",
      "data-testid=\"leads-stage-advance-button\""
    ]
  },
  "image_urls": {
    "brand_sidebar_header": {
      "description": "Optional small brand mark image for sidebar header (or use simple monogram).",
      "category": "branding",
      "urls": []
    },
    "login_none": {
      "description": "No auth; no login images needed.",
      "category": "n/a",
      "urls": []
    },
    "empty_states": {
      "description": "Use subtle real-estate imagery thumbnails in empty states for Properties/Units/Leads.",
      "category": "empty_state_thumbnails",
      "urls": [
        "https://images.unsplash.com/photo-1572608230183-eb292305d07d?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
        "https://images.unsplash.com/photo-1565795158532-387c5d115d4d?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
        "https://images.unsplash.com/photo-1716848755152-0b57bc56aabc?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      ]
    },
    "subtle_texture_optional": {
      "description": "Optional subtle texture reference for marketing-like header band; keep opacity very low (<=0.06). Prefer CSS noise over images.",
      "category": "texture_reference",
      "urls": [
        "https://images.unsplash.com/photo-1636846882019-bbdc125bb4bb?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      ]
    }
  },
  "css_scaffolds": {
    "noise_overlay": {
      "purpose": "Add a premium paper/noise texture without heavy images.",
      "add_to": "/app/frontend/src/index.css",
      "css": ".app-noise {\n  position: relative;\n}\n.app-noise::before {\n  content: \"\";\n  pointer-events: none;\n  position: absolute;\n  inset: 0;\n  background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='.18'/%3E%3C/svg%3E\");\n  opacity: 0.05;\n  mix-blend-mode: multiply;\n}\n",
      "usage": "Wrap main content container with <div className=\"app-noise\">..."
    },
    "selection": {
      "css": "::selection{ background: rgba(45,148,140,0.20); color: hsl(var(--foreground)); }"
    }
  },
  "instructions_to_main_agent": {
    "high_level": [
      "Replace App.css demo styles (black centered header) with nothing or minimal; rely on Tailwind + tokens in index.css.",
      "Implement an AppShell layout: Sidebar + Topbar + Content with sticky page header.",
      "Use shadcn Table for CRUD lists; open create/edit in Dialog (desktop) and Drawer (mobile).",
      "Calendar page: build custom 12-month grid using Cards; use shadcn Tooltip/Popover for day details. (Do not attempt to force shadcn Calendar into 12-month view.)",
      "Income: nested Collapsible breakdown; keep performance by virtualizing large tables if needed later.",
      "Notifications: right Sheet panel triggered by bell; items grouped by lead stage. Use sonner for toasts.",
      "Ensure EVERY interactive/key info element has data-testid in kebab-case."
    ],
    "file_conventions": [
      "Project uses .js (not .tsx). Components should be implemented in .jsx/.js accordingly.",
      "Use named exports for components and default exports for pages."
    ],
    "micro_interactions_to_implement": [
      "Sidebar collapse/expand with width transition (transition-[width] only).",
      "Primary buttons: hover lift (translate-y-[-1px]) + shadow; active press scale-95.",
      "Table rows: hover background tint only.",
      "Lead stage change: toast + notification item pulse."
    ]
  },
  "general_ui_ux_design_guidelines_appendix": "<General UI UX Design Guidelines>\n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>"
}
