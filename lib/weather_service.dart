import 'dart:convert';
import 'dart:math' as math;
import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';

class WeatherService {
  // 위경도를 기상청 격자(nx, ny)로 변환하는 함수
  static Map<String, int> _latLngToGrid(double lat, double lon) {
    const double RE = 6371.00877; // 지구 반경(km)
    const double GRID = 5.0; // 격자 간격(km)
    const double SLAT1 = 30.0; // 투영 위도1(degree)
    const double SLAT2 = 60.0; // 투영 위도2(degree)
    const double OLON = 126.0; // 기준점 경도(degree)
    const double OLAT = 38.0; // 기준점 위도(degree)
    const double XO = 43; // 기준점 X좌표(GRID)
    const double YO = 136; // 기점 Y좌표(GRID)

    double deg2rad(double deg) => deg * math.pi / 180.0;

    double re = RE / GRID;
    double slat1 = deg2rad(SLAT1);
    double slat2 = deg2rad(SLAT2);
    double olon = deg2rad(OLON);
    double olat = deg2rad(OLAT);

    double sn = math.tan(math.pi * 0.25 + slat2 * 0.5) / math.tan(math.pi * 0.25 + slat1 * 0.5);
    sn = math.log(math.cos(slat1) / math.cos(slat2)) / math.log(sn);
    double sf = math.tan(math.pi * 0.25 + slat1 * 0.5);
    sf = math.pow(sf, sn) * math.cos(slat1) / sn;
    double ro = math.tan(math.pi * 0.25 + olat * 0.5);
    ro = re * sf / math.pow(ro, sn);

    double ra = math.tan(math.pi * 0.25 + (lat) * deg2rad(1) * 0.5);
    ra = re * sf / math.pow(ra, sn);
    double theta = lon * deg2rad(1) - olon;
    if (theta > math.pi) theta -= 2.0 * math.pi;
    if (theta < -math.pi) theta += 2.0 * math.pi;
    theta *= sn;

    int nx = (ra * math.sin(theta) + XO + 0.5).floor();
    int ny = (ro - ra * math.cos(theta) + YO + 0.5).floor();

    return {'nx': nx, 'ny': ny};
  }

  static Future<String> getHakwonWeatherMessage(String defaultMsg) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final apiKey = prefs.getString('KMA_API_KEY') ?? '';
      
      if (apiKey.isEmpty) {
        return "$defaultMsg (설정에서 기상청 API 키를 입력하면 날씨도 알려드릴게요!)";
      }

      // 위치 권한 확인 및 현재 위치 가져오기
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
          return "$defaultMsg (위치 권한이 없어서 날씨를 가져오지 못했어요)";
        }
      }
      
      Position position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      final grid = _latLngToGrid(position.latitude, position.longitude);
      final nx = grid['nx']!;
      final ny = grid['ny']!;

      final now = DateTime.now();
      String baseDate = "${now.year}${now.month.toString().padLeft(2, '0')}${now.day.toString().padLeft(2, '0')}";
      
      int baseHour = now.hour;
      if (now.minute < 45) {
        baseHour -= 1;
        if (baseHour < 0) {
          baseHour = 23;
          final yesterday = now.subtract(const Duration(days: 1));
          baseDate = "${yesterday.year}${yesterday.month.toString().padLeft(2, '0')}${yesterday.day.toString().padLeft(2, '0')}";
        }
      }
      final baseTime = "${baseHour.toString().padLeft(2, '0')}30"; // 초단기예보는 45분 이후 호출, base_time은 매시 30분

      final url = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst?serviceKey=$apiKey&pageNo=1&numOfRows=60&dataType=JSON&base_date=$baseDate&base_time=$baseTime&nx=$nx&ny=$ny";
      
      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final items = data['response']?['body']?['items']?['item'] as List?;
        if (items != null) {
          // PTY(강수형태) 항목 찾기
          final ptyItem = items.firstWhere((item) => item['category'] == 'PTY', orElse: () => null);
          if (ptyItem != null) {
            final ptyVal = ptyItem['fcstValue'];
            if (ptyVal != "0") {
              return "학원 갈 시간이야! 🌧 밖에 비나 눈이 올 수 있으니까 우산 꼭 챙겨!";
            } else {
              return "학원 갈 시간이야! ☀ 밖은 맑거나 흐리기만 하니 조심히 다녀와.";
            }
          }
        }
      }
      return "$defaultMsg (기상청 응답 오류)";
    } catch (e) {
      return "$defaultMsg (날씨 에러: $e)";
    }
  }
}
