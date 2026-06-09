import { Card, Icon, PageHeader } from "./DashboardUi";

type ResourceLink = {
  label: string;
  url: string;
  description: string;
};

type PolicyDocument = {
  label: string;
  filename: string;
  description: string;
};

const officialLinks: ResourceLink[] = [
  {
    label: "RecordBTO",
    url: "https://recordbto.com",
    description: "Community-curated BTO launch records, prices, and reviews.",
  },
  {
    label: "BTOHQ",
    url: "https://btohq.com",
    description: "BTO launch data and analytics for Singapore.",
  },
  {
    label: "data.gov.sg",
    url: "https://data.gov.sg",
    description: "Singapore government open data portal with housing datasets.",
  },
];

const policyDocuments: PolicyDocument[] = [
  {
    label: "CPF Allocation Rates 2026",
    filename: "cpf_allocation_2026.pdf",
    description: "CPF contribution rates for different age groups from 2026.",
  },
  {
    label: "EHG Grant Amounts",
    filename: "EHG amount Couples and Families Aug 2024.pdf",
    description: "Enhanced CPF Housing Grant amounts for couples and families.",
  },
];

export function SourcesTab() {
  return (
    <section className="dashboard-page">
      <PageHeader
        title="Sources"
        subtitle="Official links and policy documents that power this planner."
      />

      <div className="sources-grid">
        <Card title="Official Links" icon="external">
          <div className="sources-card-content">
            <p className="sources-intro">
              Useful resources for BTO planning.
            </p>
            <div className="sources-list">
              {officialLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="sources-link"
                >
                  <span className="sources-link-icon">
                    <Icon name="external" />
                  </span>
                  <div className="sources-link-body">
                    <strong>{link.label}</strong>
                    <p>{link.description}</p>
                  </div>
                  <span className="sources-link-chevron">
                    <Icon name="chevron" />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Policy Documents" icon="document">
          <div className="sources-card-content">
            <p className="sources-intro">
              PDFs referenced by the policy engine. These are kept in the repo for
              offline reference.
            </p>
            <div className="sources-list">
              {policyDocuments.map((doc) => (
                <a
                  key={doc.filename}
                  href={`/data/policies/${encodeURIComponent(doc.filename)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="sources-link"
                >
                  <span className="sources-link-icon">
                    <Icon name="document" />
                  </span>
                  <div className="sources-link-body">
                    <strong>{doc.label}</strong>
                    <p>{doc.description}</p>
                  </div>
                  <span className="sources-link-chevron">
                    <Icon name="chevron" />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
