---
title: Notion에서 Github로 자동 동기화
date: '2026-08-13'
description: 노션에서 쓴 글을 자동으로 깃허브 블로그에 올려주는 프로그램을 만듦
tags:
  - NotionToGit
types:
  - Development
  - VibeCoding
<<<<<<< HEAD
notionPageId: 3bb6d44f-ad1f-80cc-a0f3-ce8383ad42b5
---
문득 블로그 비스무리한 걸 만들고 싶다는 생각이 들었습니다.
평소에 노션을 잘 쓰는데 자유로운 공개가 어려웠습니다.
노션 비슷하게 블로그를 쓰는 방법을 찾아보다가 깃페이지를 이용해 노션 내용을 그대로 옮길 수 있는 기능을 발견했습니다.
블로그 페이지를 제가 직접 만들어 노션과 동기화를 통해 글을 자동으로 작동해주는 기능이었습니다.
### 작동 방식
<callout color="gray_bg">
	Notion<br>│<br>│ 글 작성<br>▼<br>Notion API<br>│<br>▼<br>GitHub Actions<br>│<br>├── Notion → MDX 변환<br>│<br>├── Git commit<br>│<br>└── Next.js build<br>│<br>▼<br>GitHub Pages<br>│<br>▼<br>https://ehs23.github.io
</callout>
### 개발 과정
먼저 깃허브에 저장소를 만든 뒤, 로컬에서 깃허브 관련 테스트와 깃허브 블로그 초안을 만들었습니다.
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/d5d6d44f-ad1f-8172-9250-000321f4120c/430d9780-a8c4-4cb1-a209-d6b15cbcf1c3/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466QPRQPH7C%2F20260813%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260813T065951Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEBYaCXVzLXdlc3QtMiJIMEYCIQCnOFaPCNPEouSh4z0Uvr1UIqfajKXPsu9jhAuJCu7uxQIhAPUcoocsWkpooqb5fG2ylHPKG8uBtKZNae90OetssVDNKogECN%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjM3NDIzMTgzODA1IgxSogYN8w6ovnExz7Yq3AO0svnYKudDEKB0iw7GyPadlTnjywyBtShjg31b5M5ozCRXA4u4eR1grc2idQ5OnSd0bBIfLD3bR2WWMX8S3pz19pbjfKLB1Nw1IS9D%2F0VhOLso8QskWJ%2FOKBQi%2B1D%2F3cPesq%2BpmvGlSvregOM8cLh8EuqlQRJQaMK30v3qsn1yAs%2F4YUFWbKwzKIsJFjsVFO2V9E6GRKY75CZJEzUc%2B7m2sWoYAXhmQtXc09oiDyn1%2FAtw5QTp1cT7rDKFX4%2FSnzLuEpBKduNmwM1UyliY9C4c55UrWGkEWY9%2Fls47V8IKwUtYQgAhOKID%2Boxxsu96iBVcpMg%2BHwxSoQz%2BAXYJWtt9qQYReDxnaepg%2FK8J8VqIGrL38VMF9EuyShA9fO7QyVoiF1BFKHyfJLzJezo7lyEVXg%2BXjF5v20zEZXSBkJYtUzxlVqAf%2BsZsAck67yrifIOh6aVUwm23vRG6Qa7FtKKLsp2gkM%2B0uOjQu2pXu3SG2%2B2ZCUGYXlJmNrPoIqYz7ujMLviD%2F%2BBEWRg7yiG9DCQKrqP6h4RSWrpnjMf2Nzxnz26n%2B%2BanPF4QY%2Bscs2nOEW6pprVUzB7xLaOXjtRG7OE93EjIUSJXhYVQ2jyhBEUdun%2FUsOF9S58h9TDyMTDZuvXTBjqkAVe0w3NNLQRgXKk38SBGmUmY%2Fue8MhpN%2B8EV4sOKsVmIu023O1dYjCbG7mRwH%2FM5frKVxFSEBBNDCsx4iAvzowW%2FlK%2B7oy9OcNY%2BAGyKb9JWjymnPw0K%2F9%2BH%2FhIi%2FrvLdWJAfFRvZuCe6EKSYuDpR8zXlHJG%2B24J%2FzXK5GuqCSADupm5oUmiwHv3P2g%2BpJ7lfkR7v5qMEPw7mBf5qlNnXfAbpkss&X-Amz-Signature=de4b029fc4568c4691a0128689e8094ba70d6bac557f2379001623d5f4d5f522&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
-Github Repository
그 후 Notion API를 통해 제 노션 데이터베이스에 있는 글을 불러와 로컬 디렉토리에 기록하고 직접 깃허브에 커밋을 해가며 블로그가 잘 작동하는지 확인했습니다.
동기화가 잘 된 것을 확인한 후 깃허브에 있는 자동 동기화 기능을 통해 로컬에서 동기화 파일을 만들어 자동 업로드 기능을 추가했습니다. 이제 노션에 글만 쓰면 직접 관리하지 않아도 제 블로그에 자동으로 글이 올라갑니다.
![](https://prod-files-secure.s3.us-west-2.amazonaws.com/d5d6d44f-ad1f-8172-9250-000321f4120c/fe72e8ff-4bd7-4918-af8c-5066f94f5adf/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAZI2LB466QPRQPH7C%2F20260813%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20260813T065951Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEBYaCXVzLXdlc3QtMiJIMEYCIQCnOFaPCNPEouSh4z0Uvr1UIqfajKXPsu9jhAuJCu7uxQIhAPUcoocsWkpooqb5fG2ylHPKG8uBtKZNae90OetssVDNKogECN%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEQABoMNjM3NDIzMTgzODA1IgxSogYN8w6ovnExz7Yq3AO0svnYKudDEKB0iw7GyPadlTnjywyBtShjg31b5M5ozCRXA4u4eR1grc2idQ5OnSd0bBIfLD3bR2WWMX8S3pz19pbjfKLB1Nw1IS9D%2F0VhOLso8QskWJ%2FOKBQi%2B1D%2F3cPesq%2BpmvGlSvregOM8cLh8EuqlQRJQaMK30v3qsn1yAs%2F4YUFWbKwzKIsJFjsVFO2V9E6GRKY75CZJEzUc%2B7m2sWoYAXhmQtXc09oiDyn1%2FAtw5QTp1cT7rDKFX4%2FSnzLuEpBKduNmwM1UyliY9C4c55UrWGkEWY9%2Fls47V8IKwUtYQgAhOKID%2Boxxsu96iBVcpMg%2BHwxSoQz%2BAXYJWtt9qQYReDxnaepg%2FK8J8VqIGrL38VMF9EuyShA9fO7QyVoiF1BFKHyfJLzJezo7lyEVXg%2BXjF5v20zEZXSBkJYtUzxlVqAf%2BsZsAck67yrifIOh6aVUwm23vRG6Qa7FtKKLsp2gkM%2B0uOjQu2pXu3SG2%2B2ZCUGYXlJmNrPoIqYz7ujMLviD%2F%2BBEWRg7yiG9DCQKrqP6h4RSWrpnjMf2Nzxnz26n%2B%2BanPF4QY%2Bscs2nOEW6pprVUzB7xLaOXjtRG7OE93EjIUSJXhYVQ2jyhBEUdun%2FUsOF9S58h9TDyMTDZuvXTBjqkAVe0w3NNLQRgXKk38SBGmUmY%2Fue8MhpN%2B8EV4sOKsVmIu023O1dYjCbG7mRwH%2FM5frKVxFSEBBNDCsx4iAvzowW%2FlK%2B7oy9OcNY%2BAGyKb9JWjymnPw0K%2F9%2BH%2FhIi%2FrvLdWJAfFRvZuCe6EKSYuDpR8zXlHJG%2B24J%2FzXK5GuqCSADupm5oUmiwHv3P2g%2BpJ7lfkR7v5qMEPw7mBf5qlNnXfAbpkss&X-Amz-Signature=1286687a76b64fde7b15ae4f3eab1bf4d465ad670be7a9a1da603a76cdb8cdb9&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject)
-vscode 로컬 작업 환경과 노션 동기화 기록 파일
마지막으로 페이지 디자인을 완성했습니다. 홈 화면은 티스토리 메인 홈과 유사하게 만들었으며 페이지는 노션과 비슷하게 만들었습니다.
### 작업 후기
그냥 제가 원하는 걸 GPT와 함께 구현을 했을뿐인데 정말 재밌었습니다. 제가 왜 어릴때부터 컴소를 선택했는지 다시 알게 되는 기분이었습니다. 구현 과정에서 vite 및 react 등이 계속 오류를 일으키는 등 여러모로 어려운 점도 있었지만 해결 방법을 알고 나니까 지금은 능숙하게 해결해나갑니다. 총 제작 시간은 4시간으로 비교적 단시간에 제작했습니다. 그럼에도 좋은 결과물이 나와 만족스럽습니다.
다 만들고 기록을 적다보니 과정의 90퍼는 생략되어있습니다. 그래서 앞으론 더 많이 적을 것이냐 물어본다면 솔직히 이후에도 이와 비슷하게 적을 것 같습니다. 기록을 적는 것은 본인이 하고 싶게끔 해야 하는데 많이 적을 수록 제가 적기 싫어할 것이 분명하기 때문입니다.
=======
pageId: 3
notionPageId: 3bb6d44f-ad1f-80cc-a0f3-ce8383ad42b5
contentFormat: notion-blocks
---
>>>>>>> 54a7387 (1.0 : page-fix-2)
