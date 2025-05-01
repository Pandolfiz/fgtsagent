
  CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void AS $$
  BEGIN
    EXECUTE sql;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
