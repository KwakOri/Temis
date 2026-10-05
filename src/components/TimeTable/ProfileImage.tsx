interface ProfileImageProps {
  imageSrc: string;
}

const ProfileImage = ({ imageSrc }: ProfileImageProps) => {
  return (
    <img
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      className="object-cover"
      src={imageSrc}
      alt={"placeholder"}
    />
  );
};

export default ProfileImage;
