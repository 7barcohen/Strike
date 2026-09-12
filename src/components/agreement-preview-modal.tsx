"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type AgreementMode = "employee" | "investor";

type AgreementTab = "forward" | "proxy" | "secondary" | "questionnaire" | "platform";

export interface AgreementPreviewData {
  employeeName: string;
  companyName: string;
  optionCount: number;
  strikePrice: number;
  estimatedNetProceeds: number;
  investorFirmName: string;
  commitmentAmount: number;
  targetCompanyAlias: string;
  transactionDate: string;
  executionDate: string;
}

interface AgreementPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: AgreementMode;
  data: AgreementPreviewData;
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateLabel(value: string) {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return value;
  return parsedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildTabs(mode: AgreementMode) {
  return mode === "employee"
    ? (["forward", "proxy", "questionnaire", "platform"] as AgreementTab[])
    : (["secondary", "questionnaire", "platform"] as AgreementTab[]);
}

function buildDraftText(tab: AgreementTab, data: AgreementPreviewData) {
  const executionDate = formatDateLabel(data.executionDate || data.transactionDate);

  if (tab === "forward") {
    return [
      "FORWARD PURCHASE & SALE AGREEMENT",
      "",
      `This Forward Purchase & Sale Agreement (the \"Agreement\") is entered into as of ${executionDate} by and between ${data.employeeName || "Employee Holder"} (the \"Seller\") and Strike or its designated purchasing affiliate (the \"Purchaser\").`,
      `The Agreement relates to option interests in ${data.companyName} and contemplates ${data.optionCount.toLocaleString()} option units with a strike price of ${currency(data.strikePrice)} per option and estimated net proceeds to the Seller of ${currency(data.estimatedNetProceeds)}.`,
      "The Seller acknowledges that the transaction is designed to operate within the Israeli Section 102 capital gains track where applicable, and that the economic assignment contemplated herein is intended to transfer 100% of the economic rights associated with the covered interests from and after Closing.",
      "The Seller irrevocably waives any claim or right to future valuation appreciation, participation in upside, or post-transaction economic benefit arising from the covered interests after Closing, except for consideration expressly stated in this Agreement.",
      "The Seller represents that all disclosures, tax elections, and supporting grant documents have been provided in good faith and that the Seller will cooperate with reasonable requests necessary to effect transfer, withholding, and reporting obligations.",
      "This draft is for discussion purposes only and is subject to final definitive documentation, corporate approvals, transfer consents, and legal review.",
    ].join("\n\n");
  }

  if (tab === "proxy") {
    return [
      "IRREVOCABLE PROXY & POWER OF ATTORNEY",
      "",
      `This Irrevocable Proxy and Power of Attorney is granted by ${data.employeeName || "Employee Holder"} in favor of the Strike Trustee or its appointed nominee, effective as of ${executionDate}.`,
      `The undersigned appoints the Strike Trustee as the sole and exclusive proxy and attorney-in-fact with authority to vote, consent, execute drag-along or M&A sale documents, sign share transfer deeds, and deliver any notices required to consummate a Liquidity Event relating to ${data.companyName}.`,
      "The proxy is irrevocable to the fullest extent permitted by applicable law and will remain effective until all obligations under the transaction documents have been completed or terminated in accordance with their terms.",
      "The Strike Trustee is authorized to remit or arrange payment of Section 102 tax withholdings, reporting amounts, and related remittances to the Israel Tax Authority (ITA) where required in connection with a Liquidity Event.",
      "The undersigned ratifies and confirms all lawful acts undertaken within the scope of this proxy and power of attorney and agrees that such acts will be deemed the acts of the undersigned as if executed personally.",
    ].join("\n\n");
  }

  if (tab === "secondary") {
    return [
      "SECONDARY PARTICIPATION AGREEMENT",
      "",
      `This Secondary Participation Agreement is entered into as of ${executionDate} by and between ${data.investorFirmName || "Investor Firm"} (the \"Participant\") and Strike or its designated syndicate vehicle (the \"Platform\").`,
      `The Participant agrees to provide synthetic economic participation only, with a commitment amount of ${currency(data.commitmentAmount)} referencing the target company alias ${data.targetCompanyAlias || data.companyName}.`,
      "The Participant represents and warrants that it meets applicable Regulation D and Securities Act accredited investor requirements, has the authority to enter into this Agreement, and understands that no direct ownership, contact rights, or operational rights in the underlying company are granted.",
      "The Participant undertakes not to contact employees, officers, founders, transfer agents, or company counsel directly regarding the underlying securities, and agrees to maintain strict confidentiality regarding non-public transaction information.",
      "To the maximum extent permitted by law, liability arising under this Agreement is limited to fees actually received by the Platform for the relevant transaction, and the Participant agrees to indemnify only to the extent of the same agreed cap for direct breaches of its representations and confidentiality undertakings.",
      "This Agreement is conditioned on final matching, compliance review, transfer consent, and execution of definitive transaction documentation.",
    ].join("\n\n");
  }

  if (tab === "questionnaire") {
    return [
      "ACCREDITED INVESTOR QUESTIONNAIRE & DECLARATION",
      "",
      `The undersigned, on behalf of ${data.investorFirmName || "Investor Firm"}, completes this questionnaire as of ${executionDate} in connection with the contemplated transaction involving ${data.companyName}.`,
      "Please confirm one or more of the following criteria by initialing each applicable statement:",
      "1. I am an individual with net worth in excess of $1,000,000 (or approximately NIS 8.3 million) excluding primary residence, and I have sufficient liquid assets to satisfy this investment without undue hardship.",
      "2. I earned income exceeding $200,000 in each of the last two calendar years, or $300,000 combined with my spouse or spousal equivalent, and I reasonably expect to reach the same income level in the current year.",
      "3. I am an institutional investor, venture capital fund, family office, or equivalent entity that customarily invests in private securities and can evaluate the merits and risks of the proposed participation.",
      "The undersigned declares that the answers provided are true, complete, and made for the purpose of establishing investor eligibility under applicable law. The undersigned will promptly notify Strike if any representation becomes inaccurate prior to closing.",
    ].join("\n\n");
  }

  return [
    "PLATFORM TERMS OF SERVICE & PRIVACY POLICY",
    "",
    "These Platform Terms govern access to the Strike platform, including administrative, employee, and investor workflows, and apply to all users who submit, review, or match opportunities.",
    "The Platform uses a data-minimization approach: only information reasonably necessary to underwrite, match, and administer transactions is collected, stored, and shared with counterparties, service providers, and regulators.",
    "User data is processed in accordance with applicable privacy laws, including rights of access, correction, deletion, portability, objection, and restriction where required under GDPR, CCPA/CPRA, or similar regimes.",
    "Cookies and similar technologies may be used for authentication, session persistence, fraud prevention, analytics, and product experience optimization. Users may manage non-essential cookies through browser or product settings where available.",
    `By using the platform, the user acknowledges that transaction outputs, AI underwriting, and document previews are informational and do not constitute legal, tax, or investment advice.`,
    `Questions regarding these terms should be directed to the platform contact designated by Strike as of ${executionDate}.`,
  ].join("\n\n");
}

function buildPrintableHtml(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { margin: 0; padding: 40px; font-family: Georgia, serif; background: #fbf9f5; color: #0c3b2e; }
      .page { max-width: 860px; margin: 0 auto; background: #fff; border: 1px solid #e8e4dc; border-radius: 24px; padding: 32px; }
      h1 { font-size: 28px; margin: 0 0 20px; }
      pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; line-height: 1.8; color: #36433d; }
      .footer { margin-top: 28px; font-size: 11px; color: #5a5a58; text-transform: uppercase; letter-spacing: .22em; }
      @media print { body { padding: 0; } .page { border: 0; border-radius: 0; } }
    </style>
  </head>
  <body>
    <div class="page">
      <h1>${title}</h1>
      <pre>${body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
      <div class="footer">Strike draft agreement preview</div>
    </div>
    <script>window.onload = () => setTimeout(() => window.print(), 250);</script>
  </body>
</html>`;
}

export default function AgreementPreviewModal({ isOpen, onClose, mode, data }: AgreementPreviewModalProps) {
  const availableTabs = useMemo<AgreementTab[]>(() => buildTabs(mode), [mode]);

  const [activeTab, setActiveTab] = useState<AgreementTab>(availableTabs[0]);

  useEffect(() => {
    setActiveTab(availableTabs[0]);
  }, [availableTabs]);

  const activeTitle =
    activeTab === "forward"
      ? "Forward Purchase Agreement"
      : activeTab === "proxy"
        ? "Irrevocable Proxy & Power of Attorney"
        : activeTab === "secondary"
        ? "Secondary Participation Agreement"
        : activeTab === "questionnaire"
          ? "Accredited Investor Questionnaire & Declaration"
          : "Platform Terms of Service & Privacy Policy";

  const draftText = buildDraftText(activeTab, data);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(draftText);
  };

  const handleDownload = () => {
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(buildPrintableHtml(activeTitle, draftText));
    printWindow.document.close();
  };

  const renderClauses = () => {
    if (activeTab === "forward") {
      return (
        <div className="space-y-4">
          <p>
            This Forward Purchase & Sale Agreement is entered into between <span className="font-semibold text-[#0C3B2E]">{data.employeeName || "Employee Holder"}</span> and Strike or its designated purchaser as of <span className="font-semibold text-[#0C3B2E]">{formatDateLabel(data.transactionDate || data.executionDate)}</span>.
          </p>
          <p>
            The Agreement covers option interests in <span className="font-semibold text-[#0C3B2E]">{data.companyName}</span> and references <span className="font-semibold text-[#0C3B2E]">{data.optionCount.toLocaleString()}</span> options at a strike price of <span className="font-semibold text-[#0C3B2E]">{currency(data.strikePrice)}</span> per option.
          </p>
          <p>
            The parties intend that the transaction be administered within the Israeli Section 102 capital gains track where applicable, with 100% of the economic rights associated with the covered interests assigned to the purchaser upon Closing.
          </p>
          <p>
            Seller irrevocably waives any claim or right to future valuation appreciation, bonus economics, liquidation proceeds, or other post-transaction upside arising after Closing, except for the consideration expressly described in this Agreement.
          </p>
          <p>
            Estimated net proceeds to the Seller under current assumptions are <span className="font-semibold text-[#0C3B2E]">{currency(data.estimatedNetProceeds)}</span>.
          </p>
        </div>
      );
    }

    if (activeTab === "proxy") {
      return (
        <div className="space-y-4">
          <p>
            The undersigned grants Strike Trustee an irrevocable proxy and power of attorney with respect to the covered interests in <span className="font-semibold text-[#0C3B2E]">{data.companyName}</span>.
          </p>
          <p>
            The Strike Trustee may vote all shares, execute drag-along and sale documents, sign transfer deeds, and take any action required to consummate a Liquidity Event on the Seller’s behalf to the fullest extent permitted by law.
          </p>
          <p>
            The Strike Trustee is further authorized to arrange remittance of any Section 102 withholding amounts to the Israel Tax Authority (ITA) and to sign ancillary tax reporting documents reasonably required to complete the transaction.
          </p>
          <p>
            This proxy remains irrevocable until all obligations under the transaction documents have been satisfied or terminated in accordance with their terms.
          </p>
        </div>
      );
    }

    if (activeTab === "secondary") {
      return (
        <div className="space-y-4">
          <p>
            This Secondary Participation Agreement memorializes a synthetic economic participation by <span className="font-semibold text-[#0C3B2E]">{data.investorFirmName || "Investor Firm"}</span> in the opportunity tied to <span className="font-semibold text-[#0C3B2E]">{data.targetCompanyAlias || data.companyName}</span>.
          </p>
          <p>
            The Participant acknowledges that it is relying on Regulation D / Securities Act accredited investor representations and that no direct ownership, voting, or operational rights in the underlying issuer are granted by this Agreement.
          </p>
          <p>
            The Participant agrees to maintain confidentiality, avoid direct contact with company personnel except through Strike-approved channels, and accept that any liability of the Platform is capped at the platform fees actually received for the relevant transaction, subject to applicable law.
          </p>
          <p>
            The contemplated commitment amount is <span className="font-semibold text-[#0C3B2E]">{currency(data.commitmentAmount)}</span> and is subject to final matching, compliance review, and definitive document execution.
          </p>
        </div>
      );
    }

    if (activeTab === "questionnaire") {
      return (
        <div className="space-y-4">
          <p>
            The undersigned certifies, on behalf of <span className="font-semibold text-[#0C3B2E]">{data.investorFirmName || "Investor Firm"}</span>, that it satisfies one or more accredited investor standards as of <span className="font-semibold text-[#0C3B2E]">{formatDateLabel(data.executionDate || data.transactionDate)}</span>.
          </p>
          <ol className="space-y-3 pl-5">
            <li>Individual net worth exceeds $1,000,000 (or approximately NIS 8.3 million) excluding the primary residence, with adequate liquid assets to support the investment.</li>
            <li>Annual income exceeded $200,000 in each of the last two years, or $300,000 jointly with a spouse or spousal equivalent, with a reasonable expectation of the same in the current year.</li>
            <li>The investor qualifies as an institutional, VC, family office, or similar sophisticated purchaser that customarily evaluates private securities risk.</li>
          </ol>
          <p>
            The undersigned acknowledges that the above statements are made for the benefit of Strike and any counterparty relying on them, and that any material misstatement may void participation rights and trigger corrective action.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p>
          These Platform Terms of Service govern use of the Strike platform by employees, investors, and administrators and are intended to sit alongside the relevant transaction documents.
        </p>
        <p>
          The Platform applies data minimization principles, collecting only the information needed to underwrite, execute, comply, and service the transaction lifecycle. Data is retained and shared only as necessary for product delivery, legal compliance, and fraud prevention.
        </p>
        <p>
          Users are informed of privacy rights consistent with GDPR and CCPA/CPRA, including access, deletion, correction, portability, and objection where applicable. Cookie usage is disclosed for authentication, analytics, and product performance.
        </p>
        <p>
          The Platform is not a substitute for legal, tax, or investment advice, and all outputs are informational until final transaction documents are executed.
        </p>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0E1D17]/45 px-4 pb-0 pt-20 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="max-h-[86vh] w-full max-w-4xl overflow-y-auto rounded-t-[34px] border border-[#E8E4DC] bg-[#FBF9F5] p-7 shadow-[0_24px_80px_rgba(12,59,46,0.2)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#5A5A58]">Draft Agreement Preview</p>
                <h3 className="mt-2 font-serif text-3xl text-[#0C3B2E]">{activeTitle}</h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-full border border-[#E0DCD3] bg-white/90 px-5 py-2 text-sm font-medium text-[#1A1A1A] transition hover:bg-white"
              >
                Close
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {availableTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                    activeTab === tab
                      ? "bg-[#0C3B2E] text-[#FBF9F5]"
                      : "border border-[#E0DCD3] bg-white/90 text-[#5A5A58] hover:text-[#0C3B2E]"
                  }`}
                >
                  {tab === "forward" ? "Forward Purchase" : tab === "secondary" ? "Secondary Participation" : "Accredited Declaration"}
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={handleCopy} className="rounded-full border border-[#E0DCD3] bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#1A1A1A] transition hover:bg-white">
                Copy Text
              </button>
              <button onClick={handleDownload} className="rounded-full bg-[#0C3B2E] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#FBF9F5] transition hover:bg-[#124E3F]">
                Download Draft PDF
              </button>
            </div>

            <div className="mt-6 rounded-[26px] border border-[#E8E4DC] bg-white/90 p-6 text-sm leading-7 text-[#36433D]">
              {renderClauses()}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
