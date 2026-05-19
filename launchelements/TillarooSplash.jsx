import React, { useEffect } from "react";
import "./TillarooSplash.css";

const kangarooPath = `M 514 44 L 509 44 L 497 48 L 480 58 L 474 64 L 473 64 L 466 72 L 460 81 L 456 91 L 453 92 L 451 90 L 451 87 L 447 75 L 445 72 L 445 70 L 432 49 L 416 34 L 399 24 L 396 24 L 393 28 L 392 34 L 391 35 L 391 40 L 390 41 L 390 54 L 391 55 L 391 59 L 392 60 L 392 63 L 393 64 L 393 67 L 395 73 L 400 83 L 406 92 L 415 101 L 427 109 L 427 113 L 426 114 L 426 118 L 424 122 L 424 125 L 421 134 L 419 137 L 417 145 L 415 148 L 415 150 L 409 162 L 399 177 L 384 192 L 375 198 L 365 203 L 353 207 L 345 208 L 344 209 L 339 209 L 338 210 L 327 210 L 326 211 L 294 210 L 293 209 L 260 209 L 259 210 L 245 211 L 244 212 L 229 215 L 220 219 L 218 219 L 213 222 L 211 222 L 194 231 L 180 241 L 156 264 L 146 277 L 137 291 L 125 315 L 124 320 L 120 328 L 115 345 L 113 348 L 110 357 L 110 360 L 107 369 L 105 372 L 99 390 L 89 410 L 83 418 L 82 421 L 73 433 L 57 449 L 43 459 L 35 463 L 27 465 L 24 469 L 25 473 L 30 477 L 37 478 L 38 479 L 63 479 L 64 478 L 77 477 L 78 476 L 82 476 L 83 475 L 90 474 L 108 468 L 120 462 L 122 462 L 137 454 L 147 447 L 150 446 L 168 432 L 185 415 L 219 372 L 233 358 L 250 345 L 266 337 L 272 335 L 275 335 L 276 334 L 279 334 L 280 333 L 284 333 L 285 332 L 309 332 L 310 333 L 314 333 L 318 335 L 324 336 L 331 340 L 334 343 L 335 345 L 335 352 L 329 363 L 305 396 L 305 400 L 306 401 L 315 399 L 345 383 L 364 370 L 388 351 L 412 327 L 424 312 L 434 297 L 440 285 L 442 283 L 453 259 L 466 218 L 470 211 L 478 203 L 483 200 L 495 198 L 496 199 L 503 199 L 504 200 L 511 201 L 515 203 L 518 203 L 530 207 L 544 207 L 552 202 L 557 196 L 564 184 L 565 181 L 565 175 L 564 173 L 526 139 L 520 128 L 511 119 L 505 115 L 482 104 L 482 102 L 493 95 L 503 85 L 510 73 L 512 67 L 512 64 L 513 63 L 513 60 L 514 59 L 514 50 L 515 49 Z`;

export default function TillarooSplash() {
  useEffect(() => {
    let frame = 0;
    let t = 0;

    const animate = () => {
      t += 0.018;
      const pulse = (Math.sin(t) + 1) / 2;

      document.documentElement.style.setProperty("--glow-small", `${8 + pulse * 12}px`);
      document.documentElement.style.setProperty("--glow-big", `${28 + pulse * 52}px`);
      document.documentElement.style.setProperty("--glow-opacity", `${0.45 + pulse * 0.45}`);

      frame = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <main className="tillarooSplash">
      <div className="tillarooAura" />
      <svg
        className="tillarooRoo"
        viewBox="0 0 590 504"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Tillaroo loading"
      >
        <path d={kangarooPath} />
      </svg>
      <div className="tillarooWordmark"><span>T</span>illar<span>oo</span></div>
    </main>
  );
}
