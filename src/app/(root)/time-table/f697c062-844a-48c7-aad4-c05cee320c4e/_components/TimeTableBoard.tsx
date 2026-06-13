import { Imgs } from '../_img/imgs';

const TimeTableBoard = () => {
  return (
    <div
      className={`absolute flex justify-center z-10`}
      style={{
        width: 4000,
        height: 2250,
      }}
      draggable={false}
    >
      <img
        src={Imgs['first']['bg'].src}
        alt="board"
        className="absolute inset-0 object-cover"
        draggable={false}
      />
    </div>
  );
};

export default TimeTableBoard;
