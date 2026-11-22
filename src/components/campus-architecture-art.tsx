import { existsSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";
import styles from "./campus-architecture-art.module.css";

const imageName = "University architecture · hero · фрагмент референса.png";
const imagePath = `/images/${encodeURIComponent(imageName)}`;
const hasArchitectureImage = existsSync(
  join(process.cwd(), "public", "images", imageName),
);

export function CampusArchitectureArt({
  priority = false,
  sizes,
}: {
  priority?: boolean;
  sizes: string;
}) {
  return (
    <>
      {hasArchitectureImage ? (
        <Image
          alt=""
          className={styles.image}
          fill
          preload={priority}
          sizes={sizes}
          src={imagePath}
        />
      ) : (
        <span aria-hidden="true" className={styles.fallback}>
          <svg
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            viewBox="0 0 420 300"
          >
            <path d="M215 330V164c0-63 45-112 104-112s104 49 104 112v166M253 330V176c0-41 27-72 66-72s66 31 66 72v154" />
            <path d="M198 164h242M225 142h190M240 118h161M278 81h82M282 81V63m68 18V63M271 196h96m-96 42h96m-96 42h96" />
            <path d="M315 330V188m46 142V188" />
          </svg>
        </span>
      )}
      <span aria-hidden="true" className={styles.mask} />
    </>
  );
}
