import { Autocomplete, Snackbar, TextField } from '@mui/material';
import { useState } from 'react';
import { useCatchCallback, useEffectAsync } from '../../reactHelper';
import { snackBarDurationShortMs } from '../util/duration';
import { useTranslation } from './LocalizationProvider';
import fetchOrThrow from '../util/fetchOrThrow';

const LinkField = ({
  label,
  endpointAll,
  endpointLinked,
  baseId,
  keyBase,
  keyLink,
  keyGetter = (item) => item.id,
  titleGetter = (item) => item.name,
}) => {
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState();
  const [linked, setLinked] = useState();
  const [selected, setSelected] = useState();
  const [updated, setUpdated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffectAsync(async () => {
    setLoading(true);
    setError(false);
    try {
      const [allResponse, linkedResponse] = await Promise.all([
        fetchOrThrow(endpointAll),
        fetchOrThrow(endpointLinked),
      ]);
      const allItems = await allResponse.json();
      const linkedItems = await linkedResponse.json();
      setItems(allItems);
      setLinked(linkedItems);
      setSelected(linkedItems);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [endpointAll, endpointLinked]);

  const createBody = (linkId) => {
    const body = {};
    body[keyBase] = baseId;
    body[keyLink] = linkId;
    return body;
  };

  const onChange = useCatchCallback(
    async (value) => {
      const oldValue = linked.map((it) => keyGetter(it));
      const newValue = value.map((it) => keyGetter(it));
      if (!newValue.find((it) => it < 0)) {
        const results = [];
        newValue
          .filter((it) => !oldValue.includes(it))
          .forEach((added) => {
            results.push(
              fetchOrThrow('/api/permissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createBody(added)),
              }),
            );
          });
        oldValue
          .filter((it) => !newValue.includes(it))
          .forEach((removed) => {
            results.push(
              fetchOrThrow('/api/permissions', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createBody(removed)),
              }),
            );
          });
        await Promise.all(results);
        setUpdated(results.length > 0);
        setLinked(value);
        setSelected(value);
      }
    },
    [linked, setUpdated, setLinked],
  );

  return (
    <>
      <Autocomplete
        loading={loading}
        disabled={loading || error}
        isOptionEqualToValue={(i1, i2) => keyGetter(i1) === keyGetter(i2)}
        options={items || []}
        getOptionLabel={(item) => titleGetter(item)}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            slotProps={{ inputLabel: { shrink: true } }}
            placeholder={t('reportShow')}
            error={error}
            helperText={error ? t('sharedError') : null}
          />
        )}
        value={selected || []}
        onChange={(_, value) => onChange(value)}
        open={open}
        onOpen={() => {
          setOpen(true);
        }}
        onClose={() => setOpen(false)}
        multiple
      />
      <Snackbar
        open={Boolean(updated)}
        onClose={() => setUpdated(false)}
        autoHideDuration={snackBarDurationShortMs}
        message={t('sharedSaved')}
      />
    </>
  );
};

export default LinkField;
