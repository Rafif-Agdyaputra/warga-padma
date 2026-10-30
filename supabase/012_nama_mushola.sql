-- Perbarui label denah bawaan tanpa mengubah label fasilitas lainnya.
update public.map_items
set label = 'MUSHOLA DAARUL HIKMAH'
where kind = 'fasilitas' and upper(trim(label)) = 'MUSHALA AL-PADMA';
