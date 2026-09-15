# OpenLintel

**Open-source, AI-assisted interior design workflows** — exploring how residential studios can connect design decisions, drawings, and material information, requiring project-specific professional review.

> **Active development, not a verified hosted product.** The public marketing site provides an illustrative worked example and editable educational resources. It does not demonstrate that the application can complete every workflow below. Construction, fabrication, engineering, compliance, accuracy, and savings claims require separate verification. See the [product-status page](https://openlintel.com/product-status/) and [marketing launch runbook](apps/marketing/operations/LAUNCH.md).

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## The Problem

Residential design work can spread a brief, drawings, selections, revisions, and approvals across different documents and tools. When those records disagree, the next person needs to establish which information is current and which assumptions remain unresolved.

OpenLintel explores a more inspectable workflow: carry consistent room, item, drawing, and revision references through a project, while keeping professional responsibilities visible. This is a product direction, not a measured claim about industry costs or project outcomes.

## Intended Workflow — Development Direction

```
Photos/Floor Plans
        |
        v
   AI Design Engine ──> Multiple design variants at different budgets
        |
        v
   Technical Drawings ──> AutoCAD DWG, elevations, sections, RCP
        |
        v
   Bill of Materials ──> Room-by-room, category-wise quantities for review
        |
        v
   CNC Cut Lists ──> Nesting-optimized, grain direction, edge banding
        |
        v
   MEP Engineering ──> Electrical circuits, plumbing layouts, HVAC sizing
        |
        v
   Procurement ──> Multi-vendor pricing, phased ordering, delivery coordination
        |
        v
   Project Execution ──> Contractor scheduling, daily logs, milestone payments
        |
        v
   Handover ──> As-built drawings, warranty tracking, maintenance calendar
```

## Capability Areas in the Repository

The following table describes development areas, not a production feature checklist. Source code, mock data, or a route existing does not establish a tested end-to-end capability. Validate a named release and configured services before representing a workflow as available.

| Capability | Description |
|-----------|-------------|
| **Photo to 3D** | Upload room photos, get reconstructed 3D models with AI-estimated dimensions |
| **AI Design Generation** | Multiple design variants per room based on style, budget, and spatial constraints |
| **Auto-Generated Drawings** | Floor plans, elevations, sections, RCP, MEP layouts — DWG/PDF output |
| **Cut List Development** | Panel cut-list and nesting work; fabrication suitability requires separate validation |
| **Nesting Optimization** | Maximize yield from standard 8x4 sheets, track reusable offcuts |
| **Electrical Engineering** | Load calculations, circuit grouping, panel schedules, wire gauge sizing |
| **Plumbing Engineering** | Pipe sizing, slope calculations, drainage design, waterproofing specs |
| **Catalogue Integration** | Unified product schema, multi-vendor pricing, visual product search |
| **Procurement Engine** | Phased ordering, bulk discounts, just-in-time delivery coordination |
| **Project Management** | Gantt scheduling, trade dependency mapping, critical path identification |
| **Change Orders** | Cost/timeline impact analysis before approving any mid-project change |
| **Quality Assurance** | Stage-gate checklists, progress photo documentation, punch list management |
| **Digital Twin** | Living 3D model post-completion with IoT integration and concealed MEP reference |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Client Applications                   │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Web App  │  │ Mobile App   │  │ Desktop App       │  │
│  │ (Next.js)│  │ (RN / Flutter│  │ (Electron/Tauri)  │  │
│  └────┬─────┘  └──────┬───────┘  └────────┬──────────┘  │
└───────┼────────────────┼───────────────────┼─────────────┘
        │                │                   │
        └────────────────┼───────────────────┘
                         │
              ┌──────────▼──────────┐
              │    API Gateway      │
              │   (REST / GraphQL)  │
              └──────────┬──────────┘
                         │
    ┌────────────────────┼────────────────────┐
    │                    │                    │
┌───▼────┐  ┌───────────▼──────┐  ┌──────────▼─────────┐
│ Design │  │ Documentation    │  │  Execution         │
│ Engine │  │ Engine           │  │  Engine             │
├────────┤  ├──────────────────┤  ├────────────────────┤
│Capture │  │Drawing Generator │  │Contractor Matching │
│3D Recon│  │BOM Generator     │  │Schedule Manager    │
│AI Dsgn │  │Cut List Engine   │  │Procurement Engine  │
│Renderer│  │MEP Calculator    │  │Payment Manager     │
│Editor  │  │Compliance Checker│  │Quality Tracker     │
└───┬────┘  └────────┬─────────┘  └──────────┬─────────┘
    │                │                        │
    └────────────────┼────────────────────────┘
                     │
         ┌───────────▼───────────┐
         │   Shared Services     │
         ├───────────────────────┤
         │ Product Catalogue     │
         │ User Management       │
         │ Collaboration Hub     │
         │ File Storage (S3/GCS) │
         │ Search (Elasticsearch)│
         │ Notifications         │
         │ Analytics             │
         └───────────────────────┘
```

## Getting Started

> **Note**: This project is in early development. See the [Roadmap](#roadmap) for current status.

### Prerequisites

- Node.js >= 20 LTS
- Python >= 3.11
- PostgreSQL >= 16
- Redis >= 7
- Docker & Docker Compose (recommended)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/allgpt-co/openlintel.git
cd openlintel

# Copy environment template
cp .env.example .env

# Start all services with Docker Compose
docker compose up -d

# Run database migrations
npm run db:migrate

# Start the development server
npm run dev
```

Visit `http://localhost:3000` to see the app.

### Development Setup

See [docs/development.md](docs/development.md) for detailed development environment setup, including:

- Service-by-service setup without Docker
- GPU configuration for AI/ML services
- CAD engine dependencies
- Running tests

## Project Structure

```
openlintel/
├── apps/
│   ├── web/                  # Next.js web application
│   ├── mobile/               # React Native / Flutter mobile app
│   └── desktop/              # Electron/Tauri desktop app
├── packages/
│   ├── core/                 # Shared business logic
│   ├── db/                   # Database schema, migrations, queries
│   ├── ui/                   # Shared UI component library
│   └── config/               # Shared configuration
├── services/
│   ├── design-engine/        # AI design generation (Python)
│   ├── drawing-generator/    # AutoCAD DWG/DXF generation
│   ├── bom-engine/           # Bill of Materials calculation
│   ├── cutlist-engine/       # CNC cut list & nesting optimization
│   ├── mep-calculator/       # Electrical, plumbing, HVAC calculations
│   ├── catalogue-service/    # Product catalogue management
│   ├── procurement-service/  # Order & vendor management
│   ├── project-service/      # Project & schedule management
│   ├── collaboration/        # Real-time collaboration (WebSocket)
│   └── media-service/        # Photo/3D model processing pipeline
├── ml/
│   ├── room-segmentation/    # Room detection from photos
│   ├── floor-plan-digitizer/ # Raster to vector floor plan conversion
│   ├── design-gen/           # Design generation model
│   ├── measurement/          # AI measurement estimation
│   └── product-matching/     # Visual product search
├── infra/
│   ├── docker/               # Dockerfiles for each service
│   ├── k8s/                  # Kubernetes manifests
│   └── terraform/            # Infrastructure as code
├── docs/                     # Documentation
├── REQUIREMENTS.md           # Detailed product requirements
├── CONTRIBUTING.md           # Contribution guide
├── CODE_OF_CONDUCT.md        # Community code of conduct
├── CHANGELOG.md              # Version changelog
├── LICENSE                   # AGPL-3.0
└── docker-compose.yml        # Local development orchestration
```

## Roadmap

### Phase 1 — Foundation (Active)
> *Photo to Design to Drawings*

- [ ] Photo/floor plan upload and digitization
- [ ] AI design generation (single room, 3 variants)
- [ ] Basic material editor with limited catalogue
- [ ] Auto-generated floor plans and elevations (PDF output)
- [ ] Basic BOM generation
- [ ] Web application (design viewer, basic editing)

### Phase 2 — Depth
> *Manufacturing-Ready Output*

- [ ] Full 3D interactive design editor
- [ ] CNC-ready cut lists and nesting optimization
- [ ] Electrical and plumbing layout generation
- [ ] Expanded catalogue with retailer integrations
- [ ] Multi-vendor price comparison
- [ ] Mobile app (photo capture, AR measurement)

### Phase 3 — Execution
> *Design to Doorstep*

- [ ] Contractor marketplace and scheduling
- [ ] Project timeline management
- [ ] Procurement and order management
- [ ] Milestone-based payment system

### Phase 4 — Intelligence
> *Predictive and Proactive*

- [ ] AI cost and timeline prediction
- [ ] VR/AR immersive walkthroughs
- [ ] Sustainability scoring
- [ ] Budget optimization engine

### Phase 5 — Ecosystem
> *The Home Operating System*

- [ ] Digital twin with IoT integration
- [ ] Post-completion maintenance platform
- [ ] API marketplace for third-party integrations
- [ ] Global expansion with localization

## Contributing

We welcome contributions from developers, designers, architects, engineers, and domain experts. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Areas we especially need help with:**

- **CAD/BIM Engineers** — Drawing generation, IFC/DWG output
- **ML Engineers** — Room segmentation, floor plan digitization, design generation
- **Domain Experts** — Electrical/plumbing/HVAC calculation logic, building code databases
- **Frontend Developers** — WebGL 3D editor, AR/VR experiences
- **Product Catalogue** — Building regional material databases

## Community

- [Discussions](https://github.com/allgpt-co/openlintel/discussions) — Questions, ideas, show & tell
- [Issues](https://github.com/allgpt-co/openlintel/issues) — Bug reports and feature requests
- [Discord](#) — Real-time chat *(coming soon)*

## License

This project is licensed under the **GNU Affero General Public License v3.0** — see the [LICENSE](LICENSE) file for details.

**What this means:**
- You can use, modify, and distribute this software freely
- If you modify and deploy it as a service (SaaS), you **must** release your modifications under AGPL-3.0
- All derivative works must also be AGPL-3.0 licensed
- You must provide access to the complete source code to users who interact with it over a network

This license was chosen to ensure that improvements benefit the entire community, especially when the software is deployed as a hosted service.

---

**Built with ambition to make professional home design accessible to everyone.**
