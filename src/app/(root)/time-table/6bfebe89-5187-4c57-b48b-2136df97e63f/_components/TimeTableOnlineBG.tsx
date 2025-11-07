import { Imgs } from "../_img/imgs";

const TimeTableOnlineBG = () => {
  return (
    <div
      style={{
        width: 4000,
        height: 2250,
        position: "absolute",
        zIndex: 10,
      }}
    >
      <img
        src={Imgs["first"]["online"].src}
        alt={"top-object"}
        draggable={false}
      />
    </div>
  );
};

export default TimeTableOnlineBG;
