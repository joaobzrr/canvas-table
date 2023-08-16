import { TextRenderer, Font } from "text-renderer";

function main() {
  const textRenderer = new TextRenderer();

  const body = document.querySelector("body")!;

  const atlasCanvas = (textRenderer as any).glyphAtlas.canvas as HTMLCanvasElement;
  atlasCanvas.style.border = "1px solid black";
  body.appendChild(atlasCanvas);

  const screenCanvasWidth = 512;
  const screenCanvasHeight = 512;
  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = screenCanvasWidth;
  screenCanvas.height = screenCanvasHeight;
  screenCanvas.style.border = "1px solid black";
  body.appendChild(screenCanvas);

  const ctx = screenCanvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false; // @Important

  const font: Font = {
    family: "Arial",
    size: "17px",
    style: "normal",
    color: "black"
  };

  const text = "<>.,;=)(*&%$#@0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZمرحبًا بك في عالم اللغة العربية. إن اللغة العربية لغة غنية وجميلة، تحمل في طياتها تاريخًا عريقًا وثقافة عظيمة. تتميز اللغة العربية بنظامها الخاص للكتابة والنطق، وهي لغة شفافة وعميقة في المعاني. يمكن أن تكون دراسة اللغة العربية تحديًا ممتعًا، حيث يمكنك اكتشاف جمال القراءة والكتابة بها. تعد الأدبيات العربية من أغنى أنواع الأدب في العالم، وتضم مئات الشعراء والكتّاب الذين أثروا هذا المجال بأعمالهم الرائعة. إذا كنت تتعلم اللغة العربية، فأنت في طريقك لاكتشاف عالم جديد من التعبير والتواصل. АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЬЮЯабвгдежзийклмнопрстуфхцчшщъьюя環境問題は、世界中で深刻な関心を引き起こしています。工業化と都市化の進展によって、大気や水、土壌の汚染が進み、生態系への影響も懸念されています。さらに、資源の過剰な消費や廃棄物の増加も地球規模での問題となっており、持続可能な解決策の模索が求められています。経済の発展と環境保護の両立は、今後の課題であり、国際的な協力が不可欠です。新型コロナウイルスの流行によって、世界の様々な社会経済が大きな影響を受けました。テレワークが一般的になり、オンライン教育やビデオ会議の重要性が高まりました。一方で、観光業や飲食業などは壊滅的な打撃を受けました。この危機を機に、新たな働き方やビジネスの在り方について考える機会となりました。🙂😀😁😂🤣😃😄😅😆😉😊😋😎😍😘😗😙😚🤪🤩🥳🥰😇😛😜🤗🤔🤭🤫🤨🧐😐😑😶😏🙄😬🤥😌😔😪🤤😴🙃🤑😲🙁😖😞😟😤😢😭😦😧😨🤯😩🥺😬😰😱🥶🥵🤮🤢🤕🤒🥴😷🤧🤬🤮🤢🤕🤒🥴😷🤧🤬👽👾🤖🎃👻💀☠️👹👺👿🤡💩👋👏👍👎✊👊🤞✌️🤟🤘👌👈👉👆👇☝️✋🤚🖐🖖👋👏👍👎✊👊🤞✌️🤟🤘👌👈👉👆👇☝️✋🤚🖐🖖👋👏👍👎🚶‍♂️🏃‍♂️💃🕺🕴️👯‍♂️🧖‍♂️🧗‍♂️🏇🏂🏌️‍♂️🏄‍♂️🚴‍♂️🚣‍♂️🏊‍♂️🏋️‍♂️🚴‍♂️🤸‍♂️🤽‍♂️🤾‍♂️🤹‍♂️🧘‍♂️🤺🤼‍♂️🥋⛷️🏋️‍♂️🤸‍♂️🤽‍♂️🤾‍♂️👊🤜🤛👊🤜🤛👊🤜🤛👊🤜🤛👊🤜🤛👊🤜🤛👊🤜🤛👊🤜🤛👊🤜🤛👊🤜🤛👊🤜🤛👊🤜🤛👊🤜🤛👊🤜🤛👊🤜🤛👊🤜🤛👊🤜🤛";
  let originX = 0;
  let originY = 100;

  textRenderer.render(ctx, font, text, originX, originY);
}

main();
