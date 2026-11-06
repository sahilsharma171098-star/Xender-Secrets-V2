// Content script entry for Lead Leak Detector – runs in the inspected page.
import { detectLeadIssues } from "./lead-leak.js";
// The result of the script is whatever the last evaluated expression returns.
const issues = detectLeadIssues();
issues;
