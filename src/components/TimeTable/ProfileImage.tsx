import Image from "next/image";

interface ProfileImageProps {
  imageSrc: string;
}

const ProfileImage = ({ imageSrc }: ProfileImageProps) => {
  return (
    <Image fill className="object-cover" src={imageSrc} alt={"placeholder"} />
  );
};

export default ProfileImage;
