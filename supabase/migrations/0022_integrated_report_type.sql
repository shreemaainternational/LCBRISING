-- Extend the report_type enum with the integrated 360° report.
do $$ begin
  alter type report_type add value if not exists 'integrated' before 'monthly';
exception when others then null; end $$;
