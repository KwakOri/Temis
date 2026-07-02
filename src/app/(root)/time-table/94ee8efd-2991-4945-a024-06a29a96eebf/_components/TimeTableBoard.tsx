import { Imgs } from '../_img/imgs';

const TimeTableBoard = () => {
  return (
    <div
      className={`absolute inset-0 flex justify-center z-10`}
      draggable={false}
    >
      <img
        src={Imgs['first']['board'].src}
        alt="board"
        className="absolute inset-0 object-cover"
        draggable={false}
      />
    </div>
  );
};

export default TimeTableBoard;
