import { CanvasTable } from '@bzrr/canvas-table-solid';

export const App = () => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <CanvasTable
        columnDefs={[
          {
            key: 'firstName',
            title: 'First Name',
          },
          {
            key: 'lastName',
            title: 'Last Name',
          },
        ]}
        dataRows={[
          {
            id: '1',
            firstName: 'John',
            lastName: 'Lennon',
          },
          {
            id: '2',
            firstName: 'Paul',
            lastName: 'McCartney',
          },
        ]}
        renderContainer={(containerProps) => (
          <div
            style={{ width: '100%', height: '100%' }}
            {...containerProps}
          />
        )}
      />
    </div>
  );
};
