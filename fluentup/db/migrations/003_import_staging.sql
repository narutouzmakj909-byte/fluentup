-- Bulk load path for large libraries: tools/import.mjs -> entries.csv -> staging -> merge (duplicates skipped by unique(type,en_norm)).
create unlogged table if not exists entries_staging(id text, type text, en text, def text, somali text, examples jsonb, ipa text, level text, freq_rank int, category text, region text, register text, status text);
-- \copy entries_staging(id,type,en,def,somali,examples,ipa,level,freq_rank,category,region,register,status) from 'entries.csv' csv
insert into entries(id,type,en,def,somali,examples,ipa,level,freq_rank,category,region,register,status)
select id,type,en,def,somali,examples,ipa,level::cefr,freq_rank,category,region,register,coalesce(status,'unverified') from entries_staging on conflict do nothing;
truncate entries_staging;
