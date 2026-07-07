import { Imgs } from '../_img/imgs';

const TeamTimeTableBoard = () => {
  return (
    <div
      style={{
        width: 4096,
        height: 2304,
        position: 'absolute',
        zIndex: 10,
      }}
    >
      <img src={Imgs['first']['board'].src} alt={'board'} draggable={false} />
    </div>
  );
};

export default TeamTimeTableBoard;
