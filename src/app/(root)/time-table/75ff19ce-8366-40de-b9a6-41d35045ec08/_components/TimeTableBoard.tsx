import { Imgs } from '../_img/imgs';

const TimeTableBoard = () => {
  return (
    <>
      <img
        style={{
          zIndex: 12,
        }}
        src={Imgs['first']['board_frame'].src}
        alt="board"
        className="absolute inset-0 object-cover"
        draggable={false}
      />
      <img
        style={{
          mixBlendMode: 'multiply',
          zIndex: 11,
        }}
        src={Imgs['first']['board_blend'].src}
        alt="board"
        className="absolute inset-0 object-cover"
        draggable={false}
      />
      <img
        style={{
          zIndex: 10,
        }}
        src={Imgs['first']['board'].src}
        alt="board"
        className="absolute inset-0 object-cover"
        draggable={false}
      />
    </>
  );
};

export default TimeTableBoard;
