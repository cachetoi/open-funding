import { makeOfficialPageProvider } from './officialPage';

export const virginiaGovernorProvider = makeOfficialPageProvider({
  name:'Virginia State Grants', url:'https://www.governor.virginia.gov/constituent-services/grants/', funder:'Commonwealth of Virginia', geography:'Virginia',
  note:'Official Governor of Virginia grant list spanning multiple state agencies. Some listings are recurring programs rather than one-time solicitations.'
});
export const michiganEducationProvider = makeOfficialPageProvider({
  name:'Michigan Education Grants', url:'https://www.michigan.gov/mde/services/financial-management/grants', funder:'Michigan Department of Education', geography:'Michigan', category:'Education'
});
export const michiganDnrProvider = makeOfficialPageProvider({
  name:'Michigan DNR Grants', url:'https://www.michigan.gov/dnr/buy-and-apply/grants', funder:'Michigan Department of Natural Resources', geography:'Michigan', category:'Environment & Recreation'
});
export const newJerseyEducationProvider = makeOfficialPageProvider({
  name:'New Jersey Education Grants', url:'https://www.nj.gov/education/grants/opportunities/', funder:'New Jersey Department of Education', geography:'New Jersey', category:'Education'
});
export const newJerseyHumanServicesProvider = makeOfficialPageProvider({
  name:'New Jersey Human Services NOFAs', url:'https://www.nj.gov/humanservices/notices/grants/funds-available/', funder:'New Jersey Department of Human Services', geography:'New Jersey', category:'Health & Human Services', include:/refugee|services|care|housing|recovery|health|initiative/i
});
export const arizonaGoyffProvider = makeOfficialPageProvider({
  name:'Arizona GOYFF Grants', url:'https://www.volunteer.az.gov/grants', funder:"Arizona Governor's Office of Youth, Faith and Family", geography:'Arizona', category:'Community & Human Services'
});
export const connecticutDemhsProvider = makeOfficialPageProvider({
  name:'Connecticut DEMHS Grants', url:'https://portal.ct.gov/demhs/grants', funder:'Connecticut Department of Emergency Services and Public Protection', geography:'Connecticut', category:'Public Safety'
});
export const wisconsinDcfProvider = makeOfficialPageProvider({
  name:'Wisconsin DCF Grants', url:'https://dcf.wisconsin.gov/doingbusinesswith/applications', funder:'Wisconsin Department of Children and Families', geography:'Wisconsin', category:'Children & Families'
});
export const georgiaOpbProvider = makeOfficialPageProvider({
  name:'Georgia OPB Grants', url:'https://opb.georgia.gov/grant-programs', funder:"Georgia Governor's Office of Planning and Budget", geography:'Georgia'
});
