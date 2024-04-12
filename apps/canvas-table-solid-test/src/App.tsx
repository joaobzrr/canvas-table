import { CanvasTable } from "@bzrr/canvas-table-solid";

const App = () => {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: "2rem"
      }}
    >
      <CanvasTable
        columnDefs={[
          {
            key: "firstName",
            title: "First Name"
          },
          {
            key: "lastName",
            title: "Last Name"
          }
        ]}
        dataRows={[
          {
            id: "1",
            firstName: "John",
            lastName: "Lennon"
          },
          {
            id:  "2",
            firstName: "Paul",
            lastName: "McCartney"
          }
        ]}
        containerStyle={{
          width: "100%",
          height: "100%"
        }}
      />
    </div>
  );
}
export default App;
