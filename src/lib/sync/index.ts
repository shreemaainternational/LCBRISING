import { registerAdapter } from './runner';
import { csvMembersAdapter } from './adapters/csv-members';
import { csvClubsAdapter } from './adapters/csv-clubs';
import { csvOfficersAdapter } from './adapters/csv-officers';
import { csvAttendanceAdapter } from './adapters/csv-attendance';
import { restMembersAdapter } from './adapters/rest-members';

registerAdapter(csvMembersAdapter);
registerAdapter(csvClubsAdapter);
registerAdapter(csvOfficersAdapter);
registerAdapter(csvAttendanceAdapter);
registerAdapter(restMembersAdapter);

export * from './types';
export * from './runner';
export { csvToTable, parseCsv } from './csv';
