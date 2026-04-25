const POLICY = {
  lastVerified: "2026-04-24",
  country: "Singapore",
  fees: {
    applicationFee: 10,
    optionFeeByFlatType: {
      "2-room": 500,
      "3-room": 1000,
      "4-room": 2000,
      "5-room": 2000,
      executive: 2000
    },
    surveyFeeByFlatType: {
      "2-room": 163.5,
      "3-room": 231.6,
      "4-room": 299.75,
      "5-room": 354.25,
      executive: 408.75
    },
    fireInsuranceByFlatType: {
      "2-room": 1.99,
      "3-room": 3.27,
      "4-room": 4.59,
      "5-room": 5.43,
      executive: 6.68
    },
    registrationFeeLeaseEscrow: 38.3,
    registrationFeeMortgageEscrow: 38.3
  },
  downpaymentRules: {
    hdb: {
      normal: {
        signing: 0.1,
        key: 0.15,
        minCashSigning: 0,
        note: "HDB loan normal: 10% at signing, 15% at key collection."
      },
      staggered: {
        signing: 0.05,
        key: 0.2,
        minCashSigning: 0,
        note: "Staggered scheme: 5% at signing, 20% at key collection."
      },
      dia: {
        signing: 0.025,
        key: 0.225,
        minCashSigning: 0,
        note: "DIA pathway: 2.5% at signing, 22.5% at key collection."
      }
    },
    bank: {
      normal: {
        signing: 0.2,
        key: 0.05,
        minCashSigning: 0.05,
        note: "Bank loan normal: 20% at signing (minimum 5% cash), 5% at key collection."
      },
      staggered: {
        signing: 0.1,
        key: 0.15,
        minCashSigning: 0.05,
        note: "Bank loan staggered: 10% at signing (minimum 5% cash), 15% at key collection."
      },
      dia: {
        signing: 0.025,
        key: 0.225,
        minCashSigning: 0.025,
        note: "Bank loan DIA: 2.5% cash at signing, 22.5% at key collection."
      }
    },
    none: {
      normal: {
        signing: 0.2,
        key: 0.25,
        minCashSigning: 0.1,
        note: "No loan normal: 20% at signing (minimum 10% cash), 25% at key collection."
      },
      staggered: {
        signing: 0.1,
        key: 0.35,
        minCashSigning: 0.1,
        note: "No loan staggered: 10% cash at signing, 35% at key collection."
      },
      dia: {
        signing: 0.025,
        key: 0.425,
        minCashSigning: 0.025,
        note: "No loan DIA: 2.5% cash at signing, 42.5% at key collection."
      }
    }
  },
  defaultOffsets: {
    ballotAfterMonths: 2,
    bookingAfterBallotWeeks: 4,
    agreementAfterBookingMonths: 9,
    keyAfterBookingMonths: 42
  },
  sources: {
    processOverview: {
      label: "HDB Overview of New Flat Buying Process",
      url: "https://www.hdb.gov.sg/buying-a-flat/bto-sbf-and-open-booking-of-flats/process-for-buying-a-new-flat/overview"
    },
    applicationFee: {
      label: "HDB Application for a New Flat",
      url: "https://www.hdb.gov.sg/buying-a-flat/bto-sbf-and-open-booking-of-flats/process-for-buying-a-new-flat/application"
    },
    bookingOptionFee: {
      label: "HDB Booking of Flat",
      url: "https://www.hdb.gov.sg/buying-a-flat/bto-sbf-and-open-booking-of-flats/process-for-buying-a-new-flat/booking-of-flat"
    },
    agreementLease: {
      label: "HDB Sign Agreement for Lease",
      url: "https://www.hdb.gov.sg/buying-a-flat/bto-sbf-and-open-booking-of-flats/process-for-buying-a-new-flat/sign-agreement-for-lease"
    },
    keyCollection: {
      label: "HDB Key Collection",
      url: "https://www.hdb.gov.sg/buying-a-flat/bto-sbf-and-open-booking-of-flats/process-for-buying-a-new-flat/key-collection"
    },
    bsd: {
      label: "IRAS Stamp Duty Rates",
      url: "https://www.iras.gov.sg/quick-links/tax-rates/stamp-duty"
    },
    hps: {
      label: "CPF Home Protection Scheme",
      url: "https://www.cpf.gov.sg/member/home-ownership/protecting-against-losing-your-home"
    },
    fireInsurance: {
      label: "HDB Fire Insurance",
      url: "https://www.hdb.gov.sg/managing-my-home/home-ownership/fire-insurance"
    }
  }
};

const appState = {
  latestResult: null
};

const form = document.getElementById("planner-form");
const summaryCards = document.getElementById("summary-cards");
const scheduleBody = document.getElementById("schedule-body");
const timeline = document.getElementById("timeline");
const sourceList = document.getElementById("source-list");
const policyMeta = document.getElementById("policy-meta");
const exportButton = document.getElementById("export-ics");

init();

function init() {
  const today = new Date();
  form.applicationDate.value = toInputDate(today);

  policyMeta.textContent = "Policy baseline: " + POLICY.country + " | Last verified: " + POLICY.lastVerified;
  renderSources();

  form.addEventListener("submit", onSubmit);
  exportButton.addEventListener("click", onExportIcs);

  runCalculation();
}

function onSubmit(event) {
  event.preventDefault();
  runCalculation();
}

function onExportIcs() {
  if (!appState.latestResult) {
    return;
  }

  const icsText = buildIcs(appState.latestResult);
  const blob = new Blob([icsText], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  const fileNameBase = sanitizeFileName(appState.latestResult.inputs.scenarioName || "hdb-payment-plan");
  link.href = URL.createObjectURL(blob);
  link.download = fileNameBase + ".ics";
  link.click();
  URL.revokeObjectURL(link.href);
}

function runCalculation() {
  const inputs = parseInputs();
  const result = calculatePlan(inputs);
  appState.latestResult = result;

  renderCards(result);
  renderTimeline(result);
  renderSchedule(result);
}

function parseInputs() {
  return {
    scenarioName: String(form.scenarioName.value || "My HDB Plan"),
    flatType: String(form.flatType.value),
    flatPrice: toNumber(form.flatPrice.value),
    ehgGrant: toNumber(form.ehgGrant.value),
    monthlyIncome: toNumber(form.monthlyIncome.value),
    maritalStatus: String(form.maritalStatus.value),
    financing: String(form.financing.value),
    scheme: String(form.scheme.value),
    ltvRatio: toNumber(form.ltvRatio.value),
    completionMonths: toNumber(form.completionMonths.value) || POLICY.defaultOffsets.keyAfterBookingMonths,
    applicationDate: parseDate(form.applicationDate.value),
    ballotDate: parseDate(form.ballotDate.value),
    bookingDate: parseDate(form.bookingDate.value),
    agreementDate: parseDate(form.agreementDate.value),
    keyDate: parseDate(form.keyDate.value),
    registrationFeeOverride: parseOptionalNumber(form.registrationFeeOverride.value),
    gstRate: (toNumber(form.gstRate.value) || 9) / 100,
    usingCpfInstalments: Boolean(form.usingCpfInstalments.checked)
  };
}

function calculatePlan(inputs) {
  const flatPrice = Math.max(0, inputs.flatPrice);
  const ehgGrant = Math.max(0, Math.min(inputs.ehgGrant, flatPrice));
  const netPurchasePrice = flatPrice - ehgGrant;

  const rule = POLICY.downpaymentRules[inputs.financing][inputs.scheme];
  const optionFee = POLICY.fees.optionFeeByFlatType[inputs.flatType] || 0;

  const signingDownpaymentGross = netPurchasePrice * rule.signing;
  const optionFeeApplied = Math.min(optionFee, signingDownpaymentGross);
  const signingDownpaymentDue = Math.max(0, signingDownpaymentGross - optionFeeApplied);
  const keyDownpaymentDue = netPurchasePrice * rule.key;
  const totalDownpayment = signingDownpaymentGross + keyDownpaymentDue;

  const loanByRatio = inputs.financing === "none" ? 0 : netPurchasePrice * (Math.max(0, inputs.ltvRatio) / 100);
  const loanCapByRule = Math.max(0, netPurchasePrice - totalDownpayment);
  const estimatedLoanAmount = Math.min(loanByRatio, loanCapByRule);
  const unfundedAtKey = Math.max(0, netPurchasePrice - totalDownpayment - estimatedLoanAmount);

  const bsdAmount = calculateBsd(flatPrice);
  const legalFee = calculateLegalFee(flatPrice, inputs.gstRate);

  const deedStampDuty = estimatedLoanAmount > 0 ? calculateMortgageDuty(estimatedLoanAmount) : 0;
  const registrationFeeAuto = estimateRegistrationFee(inputs.financing);
  const registrationFee = inputs.registrationFeeOverride ?? registrationFeeAuto;
  const surveyFee = POLICY.fees.surveyFeeByFlatType[inputs.flatType] || 0;
  const fireInsurance = inputs.financing === "hdb" ? POLICY.fees.fireInsuranceByFlatType[inputs.flatType] || 0 : 0;

  const dates = estimateDates(inputs);

  const scheduleRows = buildScheduleRows({
    inputs,
    dates,
    rule,
    optionFee,
    signingDownpaymentDue,
    keyDownpaymentDue,
    totalDownpayment,
    estimatedLoanAmount,
    unfundedAtKey,
    bsdAmount,
    legalFee,
    deedStampDuty,
    registrationFee,
    surveyFee,
    fireInsurance
  });

  const knownPayable = scheduleRows.reduce((sum, row) => sum + (Number.isFinite(row.amount) ? row.amount : 0), 0);
  const stageTotals = sumByStage(scheduleRows);

  return {
    inputs,
    dates,
    rule,
    flatPrice,
    ehgGrant,
    netPurchasePrice,
    optionFee,
    totalDownpayment,
    estimatedLoanAmount,
    unfundedAtKey,
    bsdAmount,
    legalFee,
    deedStampDuty,
    registrationFee,
    surveyFee,
    fireInsurance,
    knownPayable,
    stageTotals,
    scheduleRows
  };
}

function buildScheduleRows(data) {
  const rows = [];

  rows.push({
    stage: "Application",
    item: "Application Fee",
    amount: POLICY.fees.applicationFee,
    date: data.dates.applicationDate,
    paymentMode: "Credit Card / PayNow",
    remarks: "Non-refundable administrative fee.",
    sourceKey: "applicationFee"
  });

  rows.push({
    stage: "Flat Booking",
    item: "Option Fee (part of downpayment)",
    amount: data.optionFee,
    date: data.dates.bookingDate,
    paymentMode: "NETS",
    remarks: "Option fee is offset against signing downpayment.",
    sourceKey: "bookingOptionFee"
  });

  rows.push({
    stage: "Sign Agreement for Lease",
    item: "Downpayment (1st instalment)",
    amount: data.signingDownpaymentDue,
    date: data.dates.agreementDate,
    paymentMode: "Cash and/or CPF OA",
    remarks: data.rule.note,
    sourceKey: "agreementLease"
  });

  rows.push({
    stage: "Sign Agreement for Lease",
    item: "Buyer Stamp Duty (BSD)",
    amount: data.bsdAmount,
    date: data.dates.agreementDate,
    paymentMode: "As instructed in appointment",
    remarks: "Calculated using current IRAS residential BSD tiers.",
    sourceKey: "bsd"
  });

  rows.push({
    stage: "Sign Agreement for Lease",
    item: "Legal Fee (purchase)",
    amount: data.legalFee.totalInclusive,
    date: data.dates.agreementDate,
    paymentMode: "Cash and/or CPF OA",
    remarks: "Rounded up before GST. Base " + toCurrency(data.legalFee.baseRounded) + ", GST " + toCurrency(data.legalFee.gstAmount) + ".",
    sourceKey: "agreementLease"
  });

  rows.push({
    stage: "Key Collection",
    item: "Downpayment (2nd instalment)",
    amount: data.keyDownpaymentDue,
    date: data.dates.keyDate,
    paymentMode: "Cash and/or CPF OA",
    remarks: "Second instalment under selected financing scheme.",
    sourceKey: "agreementLease"
  });

  if (data.unfundedAtKey > 0) {
    rows.push({
      stage: "Key Collection",
      item: "Additional amount not covered by loan",
      amount: data.unfundedAtKey,
      date: data.dates.keyDate,
      paymentMode: "Cash and/or CPF OA",
      remarks: "Occurs when LTV ratio is lower than required financing amount.",
      sourceKey: "keyCollection"
    });
  }

  if (data.deedStampDuty > 0) {
    rows.push({
      stage: "Key Collection",
      item: "Stamp Duty for Deed of Assignment",
      amount: data.deedStampDuty,
      date: data.dates.keyDate,
      paymentMode: "As instructed in appointment",
      remarks: "0.4% of loan amount, capped at 500.",
      sourceKey: "keyCollection"
    });
  }

  if (data.registrationFee > 0) {
    rows.push({
      stage: "Key Collection",
      item: "Registration Fee",
      amount: data.registrationFee,
      date: data.dates.keyDate,
      paymentMode: "Cashier's Order / CPF where allowed",
      remarks: "Auto-filled from policy baseline. You can override in form.",
      sourceKey: "keyCollection"
    });
  }

  rows.push({
    stage: "Key Collection",
    item: "Survey Fee",
    amount: data.surveyFee,
    date: data.dates.keyDate,
    paymentMode: "As instructed in appointment",
    remarks: "Flat-type based fee.",
    sourceKey: "keyCollection"
  });

  if (data.fireInsurance > 0) {
    rows.push({
      stage: "Key Collection",
      item: "HDB Fire Insurance (5-year premium)",
      amount: data.fireInsurance,
      date: data.dates.keyDate,
      paymentMode: "Cannot use CPF",
      remarks: "Mandatory for owners with HDB loans while outstanding loan remains.",
      sourceKey: "fireInsurance"
    });
  }

  if (data.inputs.usingCpfInstalments && data.inputs.financing !== "none") {
    rows.push({
      stage: "Key Collection",
      item: "Home Protection Scheme (HPS) annual premium",
      amount: NaN,
      date: data.dates.keyDate,
      paymentMode: "CPF OA or cash",
      remarks: "Amount depends on loan profile and member details. Use CPF HPS calculator.",
      sourceKey: "hps"
    });
  }

  return rows;
}

function renderCards(result) {
  const cards = [
    {
      label: "Purchase Price",
      value: toCurrency(result.flatPrice)
    },
    {
      label: "Net Price after EHG",
      value: toCurrency(result.netPurchasePrice)
    },
    {
      label: "Estimated Loan Amount",
      value: toCurrency(result.estimatedLoanAmount)
    },
    {
      label: "Total Downpayment",
      value: toCurrency(result.totalDownpayment)
    },
    {
      label: "Known Payable Across Stages",
      value: toCurrency(result.knownPayable)
    },
    {
      label: "Potential Extra at Key",
      value: toCurrency(result.unfundedAtKey)
    }
  ];

  summaryCards.innerHTML = cards
    .map(
      (card) =>
        "<article class=\"card\"><p>" +
        escapeHtml(card.label) +
        "</p><strong>" +
        escapeHtml(card.value) +
        "</strong></article>"
    )
    .join("");
}

function renderTimeline(result) {
  const items = [
    {
      label: "Apply for flat (application fee)",
      date: result.dates.applicationDate,
      sourceKey: "applicationFee"
    },
    {
      label: "Ballot result window",
      date: result.dates.ballotDate,
      sourceKey: "processOverview"
    },
    {
      label: "Book flat (option fee)",
      date: result.dates.bookingDate,
      sourceKey: "bookingOptionFee"
    },
    {
      label: "Sign Agreement for Lease",
      date: result.dates.agreementDate,
      sourceKey: "agreementLease"
    },
    {
      label: "Collect keys",
      date: result.dates.keyDate,
      sourceKey: "keyCollection"
    }
  ];

  timeline.innerHTML = items
    .map((item) => {
      const source = POLICY.sources[item.sourceKey];
      return (
        "<li><strong>" +
        escapeHtml(formatDate(item.date)) +
        "</strong> - " +
        escapeHtml(item.label) +
        " <span class=\"tag\">" +
        "<a href=\"" +
        source.url +
        "\" target=\"_blank\" rel=\"noreferrer\">source</a></span></li>"
      );
    })
    .join("");
}

function renderSchedule(result) {
  scheduleBody.innerHTML = result.scheduleRows
    .map((row, index) => {
      const source = POLICY.sources[row.sourceKey];
      return (
        "<tr>" +
        "<td><input class=\"paid-checkbox\" type=\"checkbox\" aria-label=\"mark item as paid " +
        index +
        "\" /></td>" +
        "<td>" +
        escapeHtml(row.stage) +
        "</td>" +
        "<td>" +
        escapeHtml(row.item) +
        "</td>" +
        "<td>" +
        formatAmount(row.amount) +
        "</td>" +
        "<td>" +
        escapeHtml(formatDate(row.date)) +
        "</td>" +
        "<td>" +
        escapeHtml(row.paymentMode) +
        "</td>" +
        "<td>" +
        escapeHtml(row.remarks) +
        "</td>" +
        "<td><a href=\"" +
        source.url +
        "\" target=\"_blank\" rel=\"noreferrer\">" +
        escapeHtml(source.label) +
        "</a></td>" +
        "</tr>"
      );
    })
    .join("");
}

function renderSources() {
  sourceList.innerHTML = Object.values(POLICY.sources)
    .map(
      (source) =>
        "<li><a href=\"" +
        source.url +
        "\" target=\"_blank\" rel=\"noreferrer\">" +
        escapeHtml(source.label) +
        "</a></li>"
    )
    .join("");
}

function estimateDates(inputs) {
  const appDate = inputs.applicationDate || new Date();
  const ballotDate = inputs.ballotDate || addMonths(appDate, POLICY.defaultOffsets.ballotAfterMonths);
  const bookingDate = inputs.bookingDate || addDays(ballotDate, POLICY.defaultOffsets.bookingAfterBallotWeeks * 7);
  const agreementDate = inputs.agreementDate || addMonths(bookingDate, POLICY.defaultOffsets.agreementAfterBookingMonths);
  const keyDate = inputs.keyDate || addMonths(bookingDate, inputs.completionMonths || POLICY.defaultOffsets.keyAfterBookingMonths);

  return {
    applicationDate: appDate,
    ballotDate,
    bookingDate,
    agreementDate,
    keyDate
  };
}

function calculateBsd(purchasePrice) {
  const tiers = [
    { cap: 180000, rate: 0.01 },
    { cap: 180000, rate: 0.02 },
    { cap: 640000, rate: 0.03 },
    { cap: 500000, rate: 0.04 },
    { cap: 1500000, rate: 0.05 },
    { cap: Number.POSITIVE_INFINITY, rate: 0.06 }
  ];

  let remaining = Math.max(0, purchasePrice);
  let duty = 0;

  for (const tier of tiers) {
    if (remaining <= 0) {
      break;
    }

    const taxable = Math.min(remaining, tier.cap);
    duty += taxable * tier.rate;
    remaining -= taxable;
  }

  return Math.max(1, Math.floor(duty));
}

function calculateLegalFee(purchasePrice, gstRate) {
  const amount = Math.max(0, purchasePrice);

  let base = 0;
  const tier1 = Math.min(amount, 30000);
  base += (tier1 / 1000) * 0.9;

  const tier2 = Math.min(Math.max(amount - 30000, 0), 30000);
  base += (tier2 / 1000) * 0.72;

  const tier3 = Math.max(amount - 60000, 0);
  base += (tier3 / 1000) * 0.6;

  const baseRounded = Math.ceil(base);
  let totalInclusive = baseRounded * (1 + Math.max(0, gstRate));

  if (totalInclusive < 21.8) {
    totalInclusive = 21.8;
  }

  const totalRounded = roundTo2(totalInclusive);
  const gstAmount = roundTo2(totalRounded - baseRounded);

  return {
    baseRounded,
    gstAmount,
    totalInclusive: totalRounded
  };
}

function calculateMortgageDuty(loanAmount) {
  const raw = loanAmount * 0.004;
  return Math.min(500, Math.max(1, Math.floor(raw)));
}

function estimateRegistrationFee(financing) {
  if (financing === "hdb") {
    return POLICY.fees.registrationFeeLeaseEscrow + POLICY.fees.registrationFeeMortgageEscrow;
  }

  if (financing === "bank" || financing === "none") {
    return POLICY.fees.registrationFeeLeaseEscrow;
  }

  return 0;
}

function sumByStage(rows) {
  const map = {};

  for (const row of rows) {
    if (!Number.isFinite(row.amount)) {
      continue;
    }

    map[row.stage] = (map[row.stage] || 0) + row.amount;
  }

  return map;
}

function buildIcs(result) {
  const events = [];
  const dtStamp = formatIcsDateTime(new Date());

  for (let index = 0; index < result.scheduleRows.length; index += 1) {
    const row = result.scheduleRows[index];

    if (!Number.isFinite(row.amount) || !row.date) {
      continue;
    }

    const day = formatIcsDate(row.date);
    const summary = escapeIcsText("HDB Payment - " + row.stage + " - " + row.item);
    const description = escapeIcsText(
      "Amount: " +
        toCurrency(row.amount) +
        "\\nEstimated date: " +
        formatDate(row.date) +
        "\\nPayment mode: " +
        row.paymentMode +
        "\\nRemarks: " +
        row.remarks
    );

    events.push(
      "BEGIN:VEVENT\n" +
        "UID:" +
        sanitizeFileName(result.inputs.scenarioName) +
        "-" +
        index +
        "@hdb-planner\n" +
        "DTSTAMP:" +
        dtStamp +
        "\n" +
        "DTSTART;VALUE=DATE:" +
        day +
        "\n" +
        "DTEND;VALUE=DATE:" +
        formatIcsDate(addDays(row.date, 1)) +
        "\n" +
        "SUMMARY:" +
        summary +
        "\n" +
        "DESCRIPTION:" +
        description +
        "\n" +
        "END:VEVENT"
    );
  }

  return (
    "BEGIN:VCALENDAR\n" +
    "VERSION:2.0\n" +
    "PRODID:-//HDB Planner//EN\n" +
    "CALSCALE:GREGORIAN\n" +
    events.join("\n") +
    "\nEND:VCALENDAR"
  );
}

function toCurrency(value) {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
}

function formatAmount(amount) {
  if (Number.isFinite(amount)) {
    return toCurrency(amount);
  }

  return "Depends";
}

function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-SG", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(date);
}

function toInputDate(date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function parseDate(rawValue) {
  if (!rawValue) {
    return null;
  }

  const date = new Date(rawValue + "T00:00:00");
  return Number.isNaN(date.getTime()) ? null : date;
}

function addMonths(date, months) {
  const output = new Date(date.getTime());
  output.setMonth(output.getMonth() + months);
  return output;
}

function addDays(date, days) {
  const output = new Date(date.getTime());
  output.setDate(output.getDate() + days);
  return output;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundTo2(value) {
  return Math.round(value * 100) / 100;
}

function sanitizeFileName(text) {
  return String(text || "hdb-plan")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatIcsDate(date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + month + day;
}

function formatIcsDateTime(date) {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return year + month + day + "T" + hours + minutes + seconds + "Z";
}

function escapeIcsText(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
