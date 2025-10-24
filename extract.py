# extract_arrow_colors.py
import os
from PIL import Image
from collections import Counter

def rgb_to_hex(rgb):
    """RGB 튜플을 16진수 색상 문자열로 변환합니다."""
    return f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}".upper()

def get_dominant_color(image_path, exclude_transparent=True):
    """
    이미지에서 가장 많이 나타나는 색상을 추출합니다.
    투명한 픽셀(알파 채널이 128 미만)은 무시합니다.
    
    Args:
        image_path (str): 이미지 파일 경로.
        exclude_transparent (bool): True인 경우 투명 픽셀을 무시합니다.
        
    Returns:
        tuple: 가장 많이 나타나는 색상의 RGB 튜플.
               이미지를 찾을 수 없거나 불투명한 픽셀이 없으면 (0, 0, 0)을 반환합니다.
    """
    try:
        img = Image.open(image_path).convert("RGBA")
    except FileNotFoundError:
        print(f"경고: 이미지를 찾을 수 없습니다: {image_path}. 기본 검정색을 반환합니다.")
        return (0, 0, 0)
    except Exception as e:
        print(f"오류: 이미지 {image_path}를 여는 중 오류 발생: {e}. 기본 검정색을 반환합니다.")
        return (0, 0, 0)

    pixels = img.getdata()
    
    # 투명하지 않은 픽셀만 필터링 (알파 채널이 128 이상인 경우)
    if exclude_transparent:
        non_transparent_pixels = [p[:3] for p in pixels if p[3] >= 128]
    else:
        non_transparent_pixels = [p[:3] for p in pixels]

    if not non_transparent_pixels:
        return (0, 0, 0) # 투명하지 않은 픽셀이 없으면 기본 검정색 반환

    # 색상 출현 횟수 계산
    color_counts = Counter(non_transparent_pixels)
    
    # 가장 많이 나타나는 색상 반환
    return color_counts.most_common(1)[0][0]

def generate_arrow_colors_js(vectors_folder, output_file):
    arrow_colors_map = {}
    
    # ARROW_COLOR의 40개 인덱스(0-39)를 순회합니다.
    for idx in range(40):
        ccw_angle = idx * 9 # 이 인덱스에 해당하는 반시계 방향 각도
        
        # PNG 파일 이름 규칙에 맞게 반시계 방향 각도를 시계 방향 각도로 변환합니다.
        # PNG 파일은 arrow_XXX.png 형식이며, XXX는 시계 방향 각도입니다.
        # 예: idx 0 (CCW 0도) -> CW 0도 (arrow_000.png)
        #     idx 1 (CCW 9도) -> CW 351도 (arrow_351.png)
        #     idx 39 (CCW 351도) -> CW 9도 (arrow_009.png)
        cw_angle = (360 - ccw_angle) % 360
        
        png_filename = f"arrow_{cw_angle:03d}.png"
        image_path = os.path.join(vectors_folder, png_filename)
        
        dominant_rgb = get_dominant_color(image_path)
        hex_color = rgb_to_hex(dominant_rgb)
        
        arrow_colors_map[idx] = (hex_color, png_filename)

    # JavaScript 콘텐츠 생성
    js_content = "// 이 파일은 'extract_arrow_colors.py' 파이썬 스크립트에 의해 자동으로 생성되었습니다.\n"
    js_content += "// PNG 파일에서 추출된 메인 색상입니다.\n"
    js_content += "export const ARROW_COLOR = {\n"
    for idx in range(40):
        color, filename = arrow_colors_map.get(idx, ("#000000", "N/A"))
        js_content += f"  {idx}: \"{color}\", // From {filename}\n"
    js_content += "};\n\n"
    
    # 이전 변경사항에서 window 전역 노출 코드를 제거했으므로, 여기에서도 포함하지 않습니다.

    # 출력 파일에 쓰기
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(js_content)
    
    print(f"'{output_file}' 파일이 추출된 색상으로 성공적으로 생성되었습니다.")

if __name__ == "__main__":
    # --- 설정 ---
    # 이 스크립트(예: extract_arrow_colors.py)가 프로젝트 루트 디렉토리(MergeWeaver)에 있다고 가정합니다.
    # 프로젝트 루트는 'c:\Users\cheru\Documents\Code\GitPage\MergeWeaver\' 입니다.
    
    # 스크립트 위치에 따라 경로를 조정하세요.
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = script_dir # 스크립트가 프로젝트 루트에 있다고 가정

    VECTORS_FOLDER = os.path.join(project_root, "assets", "vectors")
    OUTPUT_FILE = os.path.join(project_root, "src", "arrowColors.js")

    generate_arrow_colors_js(VECTORS_FOLDER, OUTPUT_FILE)
    
    print("\n--- 중요 ---")
    print("'arrowColors.js' 파일이 PNG 파일에서 발견된 주요 색상을 기반으로 생성되었습니다.")
    print("생성된 파일을 검토하여 색상이 시각적으로 충분히 잘 구분되는지 확인해 주세요.")
    print("만약 구분이 충분하지 않다면, 원본 PNG 파일을 조정하거나 'arrowColors.js'를 수동으로 편집해야 할 수 있습니다.")

