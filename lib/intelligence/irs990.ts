/**
 * IRS 990/990-PF intelligence boundary.
 *
 * OpenFunding intentionally does NOT download the IRS bulk archive during a normal
 * web request. The XML archives are large and belong in a scheduled ingestion job.
 * This module defines the normalized record we will index later so the UI/data model
 * does not need to change when foundation intelligence is switched on.
 */
export type FoundationGrantHistory = {
  funderEin: string;
  funderName: string;
  filingYear: number;
  recipientName: string;
  recipientEin?: string;
  recipientCity?: string;
  recipientState?: string;
  amount: number;
  purpose?: string;
  source: 'IRS 990-PF';
};

export type FoundationEstimate = {
  funderEin: string;
  sampleSize: number;
  medianGrant?: number;
  lowerQuartile?: number;
  upperQuartile?: number;
  estimatedMin?: number;
  estimatedMax?: number;
  confidence: 'low' | 'medium' | 'high';
  basis: 'irs-990-pf';
};

export const IRS_990_DOWNLOAD_PAGE = 'https://www.irs.gov/charities-non-profits/form-990-series-downloads';
