import type { NewCommunication } from "@/types/communication";

/**
 * Synthetic sample data for Phase 1-3 development and evaluation.
 *
 * Dates are anchored to a fixed reference date (rather than `Date.now()`)
 * so re-seeding the database does not shift the content of the golden
 * evaluation dataset built in Phase 3. The anchor is 2026-09-20.
 */
const ANCHOR = new Date("2026-09-20T09:00:00Z");

function iso(offsetDays: number, hour = 9): string {
  const d = new Date(ANCHOR);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

function dateOnly(offsetDays: number): string {
  return iso(offsetDays).slice(0, 10);
}

const email = (name: string, domain: string) => `${name}@${domain}`;

export const sampleCommunications: NewCommunication[] = [
  // ---------------------------------------------------------------- FINANCIAL
  {
    source: "sample",
    source_type: "email",
    sender: email("alerts", "hdfcbank.com"),
    sender_name: "HDFC Bank",
    subject: "Credit Card Payment Due Tomorrow",
    content:
      `Dear Customer,\n\nYour HDFC Bank credit card ending 4521 has a payment of INR 42,500 due on ${dateOnly(1)}. ` +
      `Please pay before the due date to avoid late fees and interest charges. You can pay via net banking or the HDFC app.\n\nThank you,\nHDFC Bank`,
    received_at: iso(0),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("alerts", "hdfcbank.com"),
    sender_name: "HDFC Bank",
    subject: "Debit Alert: INR 15,000 spent at Amazon",
    content:
      `A transaction of INR 15,000 was made on your HDFC debit card at AMAZON.IN on ${dateOnly(-1)}. ` +
      `If you did not make this transaction, contact HDFC Bank support immediately.`,
    received_at: iso(-1),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("refunds", "amazon.in"),
    sender_name: "Amazon.in",
    subject: "Your refund of INR 2,300 has been processed",
    content:
      `Hi,\n\nWe've processed a refund of INR 2,300 for your returned item "Wireless Mouse" (Order #402-8817263). ` +
      `The amount will reflect in your original payment method within 5-7 business days.\n\nAmazon.in`,
    received_at: iso(-2),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("billing", "freelance-client.com"),
    sender_name: "Globex Inc Billing",
    subject: "Invoice INV-2291 - Payment Due",
    content:
      `Hello,\n\nPlease find attached invoice INV-2291 for consulting services rendered in August, amounting to USD 1,200. ` +
      `Payment is due by ${dateOnly(10)}. Let us know if you have any questions.\n\nGlobex Inc`,
    received_at: iso(0),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("billing", "netflix.com"),
    sender_name: "Netflix",
    subject: "Your Netflix membership renews soon",
    content:
      `Hi,\n\nYour Netflix Premium subscription (INR 649/month) will renew on ${dateOnly(3)}. ` +
      `Your payment method on file will be charged automatically. No action is needed unless you want to change your plan.\n\nNetflix`,
    received_at: iso(0),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("billing", "cityelectric.com"),
    sender_name: "City Electric Board",
    subject: "OVERDUE: Electricity bill payment pending",
    content:
      `Your electricity bill of INR 3,150 for account 88213 was due on ${dateOnly(-3)} and remains unpaid. ` +
      `Please pay immediately to avoid disconnection of service.`,
    received_at: iso(-1),
  },

  // ------------------------------------------------------------------ TRAVEL
  {
    source: "sample",
    source_type: "email",
    sender: email("noreply", "indigo.com"),
    sender_name: "IndiGo Airlines",
    subject: "Booking Confirmed: 6E-204 Mumbai to Delhi",
    content:
      `Your flight is confirmed.\n\nFlight: 6E-204\nRoute: Mumbai (BOM) -> Delhi (DEL)\nDate: ${dateOnly(6)}\n` +
      `Departure: 07:15\nPNR: XY7KQP\n\nThank you for booking with IndiGo.`,
    received_at: iso(-4),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("noreply", "indigo.com"),
    sender_name: "IndiGo Airlines",
    subject: "Flight 6E-204 departure time changed",
    content:
      `Dear passenger,\n\nYour flight 6E-204 on ${dateOnly(6)} from Mumbai to Delhi (PNR: XY7KQP) has been rescheduled. ` +
      `New departure time: 11:40 (previously 07:15). Please check the updated itinerary before travelling.`,
    received_at: iso(1),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("noreply", "airindia.com"),
    sender_name: "Air India",
    subject: "Flight AI-509 has been cancelled",
    content:
      `We regret to inform you that flight AI-509 on ${dateOnly(2)} from Delhi to Bengaluru (PNR: LM3ZQR) has been cancelled. ` +
      `Please rebook via our website or contact support for a full refund.`,
    received_at: iso(0),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("reservations", "tajhotels.com"),
    sender_name: "Taj Hotels",
    subject: "Reservation confirmed at Taj Lands End",
    content:
      `Your reservation at Taj Lands End, Mumbai is confirmed.\n\nCheck-in: ${dateOnly(6)}\nCheck-out: ${dateOnly(8)}\n` +
      `Confirmation number: TLE-99231\n\nWe look forward to welcoming you.`,
    received_at: iso(-4),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("bookings", "zoomcar.com"),
    sender_name: "Zoomcar",
    subject: "Car rental confirmed for your Delhi trip",
    content:
      `Your car rental booking is confirmed.\n\nVehicle: Hyundai i20\nPickup: Delhi Airport, ${dateOnly(6)} 12:00\n` +
      `Drop-off: ${dateOnly(8)} 10:00\nBooking ID: ZC-55210`,
    received_at: iso(-3),
  },

  // -------------------------------------------------------------------- WORK
  {
    source: "sample",
    source_type: "email",
    sender: email("priya.sharma", "company.com"),
    sender_name: "Priya Sharma (Manager)",
    subject: "Need the Q3 report by end of day",
    content:
      `Hi,\n\nCan you send me the Q3 performance report before end of day today? I need it for the leadership review tomorrow morning. ` +
      `Let me know if you need anything from me to finish it.\n\nThanks,\nPriya`,
    received_at: iso(0),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("priya.sharma", "company.com"),
    sender_name: "Priya Sharma (Manager)",
    subject: "Project Alpha - weekly status update",
    content:
      `Team,\n\nProject Alpha is on track. Backend integration is complete and QA starts ${dateOnly(2)}. ` +
      `No blockers at the moment. Full update in the shared doc.\n\nPriya`,
    received_at: iso(-2),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("daniel.osei", "globexinc.com"),
    sender_name: "Daniel Osei (Globex Inc)",
    subject: "Issue with our last delivery - need response",
    content:
      `Hello,\n\nWe received the wrong SKU in our last shipment under our Globex Inc contract and need this resolved before ${dateOnly(3)} ` +
      `for our own downstream commitments. Please advise on next steps.\n\nDaniel Osei\nGlobex Inc`,
    received_at: iso(0),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("calendar", "company.com"),
    sender_name: "Company Calendar",
    subject: "Meeting rescheduled: Project Beta sync",
    content:
      `The "Project Beta sync" meeting originally scheduled for ${dateOnly(1)} 10:00 has been moved to ${dateOnly(2)} 15:00. ` +
      `Same video link applies.`,
    received_at: iso(0),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("hr", "company.com"),
    sender_name: "Company HR",
    subject: "FYI: Updated office holiday calendar",
    content:
      `Hi all,\n\nFor your information, the updated holiday calendar for the rest of the year has been published on the intranet. ` +
      `No action is needed.\n\nHR Team`,
    received_at: iso(-5),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("priya.sharma", "company.com"),
    sender_name: "Priya Sharma (Manager)",
    subject: "Performance review scheduled",
    content:
      `Hi,\n\nJust a reminder that your performance review is scheduled for ${dateOnly(9)} at 14:00. ` +
      `Please fill out the self-assessment form before then.\n\nPriya`,
    received_at: iso(-1),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("arjun.mehta", "company.com"),
    sender_name: "Arjun Mehta",
    subject: "Please review my PR before merging",
    content:
      `Hey,\n\nCould you review my pull request for the notifications service when you get a chance? ` +
      `Ideally before ${dateOnly(1)} since we want to ship it this sprint.\n\nThanks,\nArjun`,
    received_at: iso(0),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("security-noreply", "cisco.com"),
    sender_name: "Cisco",
    subject: "New sign-in to your Cisco Webex account",
    content:
      `We noticed a new sign-in to your Cisco Webex account from a new device on ${dateOnly(-1)}. ` +
      `If this was you, no action is needed. If not, please secure your account immediately.`,
    received_at: iso(-1),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("teams-noreply", "microsoft.com"),
    sender_name: "Microsoft Teams",
    subject: "You have a meeting invite: Vendor sync",
    content:
      `You've been invited to "Vendor sync" on ${dateOnly(4)} at 16:00 via Microsoft Teams. ` +
      `Organizer: Priya Sharma. Please accept or decline.`,
    received_at: iso(-1),
  },

  // ---------------------------------------------------------------- SHOPPING
  {
    source: "sample",
    source_type: "email",
    sender: email("orders", "amazon.in"),
    sender_name: "Amazon.in",
    subject: "Order confirmed: Mechanical Keyboard",
    content:
      `Your order for "Mechanical Keyboard - RGB" has been placed.\n\nOrder #403-1182934\nAmount: INR 4,499\n` +
      `Expected delivery: ${dateOnly(4)}`,
    received_at: iso(-3),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("shipment", "amazon.in"),
    sender_name: "Amazon.in",
    subject: "Your order has shipped",
    content:
      `Good news! Your order #403-1182934 ("Mechanical Keyboard - RGB") has shipped and is on its way. ` +
      `Expected delivery: ${dateOnly(4)}.`,
    received_at: iso(-1),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("shipment", "amazon.in"),
    sender_name: "Amazon.in",
    subject: "Arriving tomorrow: Mechanical Keyboard",
    content:
      `Your package with order #403-1182934 is arriving tomorrow, ${dateOnly(1)}. ` +
      `Make sure someone is available to receive it.`,
    received_at: iso(0),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("returns", "amazon.in"),
    sender_name: "Amazon.in",
    subject: "Return confirmed for Wireless Mouse",
    content:
      `Your return request for "Wireless Mouse" (Order #402-8817263) has been confirmed. ` +
      `Please drop off the package at the nearest pickup point by ${dateOnly(2)}.`,
    received_at: iso(-6),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("refunds", "amazon.in"),
    sender_name: "Amazon.in",
    subject: "Refund issued for your return",
    content:
      `Your refund of INR 899 for order #402-8817263 has been issued to your original payment method.`,
    received_at: iso(-2),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("shipment", "flipkart.com"),
    sender_name: "Flipkart",
    subject: "Delay in your order delivery",
    content:
      `We're sorry, your order #FK-778213 ("Desk Lamp") is delayed due to logistics issues. ` +
      `New expected delivery date: ${dateOnly(7)}.`,
    received_at: iso(-1),
  },

  // ------------------------------------------------------------- SUBSCRIPTION
  {
    source: "sample",
    source_type: "email",
    sender: email("billing", "aws.amazon.com"),
    sender_name: "AWS Billing",
    subject: "Your AWS bill for August is ready - USD 184.32",
    content:
      `Your AWS invoice for August is ready. Total amount due: USD 184.32. ` +
      `Payment will be automatically charged to your account on file on ${dateOnly(5)}.`,
    received_at: iso(-2),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("billing", "spotify.com"),
    sender_name: "Spotify",
    subject: "Your Spotify Premium renews in 3 days",
    content:
      `Your Spotify Premium subscription (INR 119/month) renews on ${dateOnly(3)}. ` +
      `No action needed unless you'd like to cancel or change your plan.`,
    received_at: iso(0),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("billing", "cultfit.com"),
    sender_name: "Cult.fit",
    subject: "Your gym membership renews soon",
    content:
      `Your Cult.fit membership (INR 1,999/month) is set to renew on ${dateOnly(4)}. ` +
      `Update your payment method if needed before then.`,
    received_at: iso(-1),
  },

  // --------------------------------------------------------------- MARKETING
  {
    source: "sample",
    source_type: "email",
    sender: email("deals", "amazon.in"),
    sender_name: "Amazon.in",
    subject: "Big Billion Days: Up to 70% off electronics",
    content:
      `Don't miss out! Our biggest sale of the season is here. Up to 70% off on electronics, fashion, and more. ` +
      `Shop now before the sale ends.`,
    received_at: iso(-3),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("newsletter", "techcrunch.com"),
    sender_name: "TechCrunch",
    subject: "This week in tech: AI, funding rounds, and more",
    content:
      `Your weekly roundup of the biggest stories in tech: AI product launches, notable funding rounds, ` +
      `and this week's top startup news.`,
    received_at: iso(-1),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("offers", "spotify.com"),
    sender_name: "Spotify",
    subject: "Upgrade to Spotify Family and save",
    content:
      `Switch to Spotify Family and get up to 6 accounts for less than the price of 6 individual plans. ` +
      `Limited time offer.`,
    received_at: iso(-4),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("offers", "zomato.com"),
    sender_name: "Zomato",
    subject: "50% off at restaurants near you this weekend",
    content:
      `Get 50% off (up to INR 150) at participating restaurants near you this weekend only. Order now!`,
    received_at: iso(-2),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("events", "coursera.org"),
    sender_name: "Coursera",
    subject: "Join our free webinar on AI product management",
    content:
      `You're invited to a free webinar: "Building AI Products That Matter" on ${dateOnly(8)} at 18:00 IST. ` +
      `Register now to save your spot.`,
    received_at: iso(-3),
  },

  // ---------------------------------------------------------------- SOCIAL / LOW-VALUE
  {
    source: "sample",
    source_type: "email",
    sender: email("notifications", "linkedin.com"),
    sender_name: "LinkedIn",
    subject: "3 people viewed your profile this week",
    content: `Your profile is getting noticed! 3 people viewed your profile in the past week. See who viewed your profile.`,
    received_at: iso(-1),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("info", "x.com"),
    sender_name: "X (Twitter)",
    subject: "Your weekly digest is here",
    content: `Here's what happened this week on X: trending topics, posts you might have missed, and more.`,
    received_at: iso(-2),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("events", "facebookmail.com"),
    sender_name: "Facebook",
    subject: "Reminder: Community meetup this weekend",
    content: `Don't forget! "Local Tech Meetup" is happening this weekend. Tap to see who's going.`,
    received_at: iso(-1),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("no-reply", "appupdates.io"),
    sender_name: "App Updates",
    subject: "A new version of your app is available",
    content: `Version 4.2.1 is now available with performance improvements and bug fixes. Update at your convenience.`,
    received_at: iso(-5),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("no-reply", "system-notices.io"),
    sender_name: "System Notices",
    subject: "Scheduled maintenance completed",
    content: `Scheduled maintenance for our platform completed successfully. No further action is required.`,
    received_at: iso(-6),
  },

  // ------------------------------------------------------------- MISC / MIXED
  {
    source: "sample",
    source_type: "email",
    sender: email("estatements", "hdfcbank.com"),
    sender_name: "HDFC Bank",
    subject: "Your monthly account statement is ready",
    content: `Your HDFC Bank savings account statement for the past month is ready to view and download in net banking.`,
    received_at: iso(-2),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("visa-status", "vfsglobal.com"),
    sender_name: "VFS Global",
    subject: "Your visa application status has been updated",
    content:
      `Your visa application (reference VF-220914) status has changed to "Passport dispatched". ` +
      `Expected delivery of documents: ${dateOnly(3)}.`,
    received_at: iso(-1),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("policy", "licindia.com"),
    sender_name: "LIC of India",
    subject: "Insurance premium of INR 18,400 due",
    content: `Your annual life insurance premium of INR 18,400 for policy 998211 is due on ${dateOnly(5)}. Please pay before the due date to keep your policy active.`,
    received_at: iso(-1),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("arjun.mehta", "company.com"),
    sender_name: "Arjun Mehta",
    subject: "Team lunch this Friday?",
    content: `Hey, a few of us are planning to grab lunch this Friday to celebrate the Project Beta launch. Let me know if you're in!`,
    received_at: iso(-1),
  },
  {
    source: "sample",
    source_type: "email",
    sender: email("priya.sharma", "company.com"),
    sender_name: "Priya Sharma (Manager)",
    subject: "Project Beta - launch retrospective notes",
    content: `Hi team,\n\nSharing the retrospective notes from the Project Beta launch. Overall went well, a few process improvements identified for next time. No action needed, just FYI.\n\nPriya`,
    received_at: iso(-3),
  },
];
