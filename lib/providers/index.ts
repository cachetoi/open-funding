import { grantsGovProvider } from './grantsGov';
import { makeRssProvider } from './rss';
import { massGovProvider } from './massGov';
import { californiaProvider } from './california';
import { illinoisProvider } from './illinois';
import { washingtonProvider } from './washington';
import { pennsylvaniaProvider } from './pennsylvania';
import { newYorkProvider } from './newYork';
import { minnesotaProvider } from './minnesota';
import { texasProvider } from './texas';
import { northCarolinaProvider } from './northCarolina';
import { sbirProvider } from './sbir';
import { virginiaGovernorProvider, michiganEducationProvider, michiganDnrProvider, newJerseyEducationProvider, newJerseyHumanServicesProvider, arizonaGoyffProvider, connecticutDemhsProvider, wisconsinDcfProvider, georgiaOpbProvider } from './expandedStates';

export const providers = [
  grantsGovProvider,
  sbirProvider,
  makeRssProvider({ name: 'NSF Funding RSS', url: 'https://www.nsf.gov/rss/rss_www_funding_pgm_annc_inf.xml', funder: 'U.S. National Science Foundation', category: 'Science & Research' }),
  massGovProvider,
  californiaProvider,
  illinoisProvider,
  washingtonProvider,
  pennsylvaniaProvider,
  newYorkProvider,
  minnesotaProvider,
  texasProvider,
  northCarolinaProvider,
  virginiaGovernorProvider,
  michiganEducationProvider,
  michiganDnrProvider,
  newJerseyEducationProvider,
  newJerseyHumanServicesProvider,
  arizonaGoyffProvider,
  connecticutDemhsProvider,
  wisconsinDcfProvider,
  georgiaOpbProvider,
];
