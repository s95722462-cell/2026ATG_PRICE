    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const voiceSearchButton = document.getElementById('voiceSearchButton');
    const micIcon = document.getElementById('micIcon');
    const voiceSearchText = document.getElementById('voiceSearchText');
    const resultsTableBody = document.getElementById('resultsTableBody');
    const errorMessageDiv = document.getElementById('errorMessage');
    const discountRateInput = document.getElementById('discountRate');
    let productData = [];
    let currentResults = [];

    // Check for Web Speech API compatibility
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
    const SpeechRecognitionEvent = window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent;

    if (!SpeechRecognition) {
        voiceSearchButton.style.display = 'none'; // Hide button if not supported
        console.warn('Web Speech API is not supported in this browser.');
    }

    async function loadProductData() {
        errorMessageDiv.style.display = 'none';
        try {
            const response = await fetch('csvjson.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            productData = await response.json();
            console.log('제품 데이터 로드 완료.', productData.length, '개 항목');
            resultsTableBody.innerHTML = `<tr><td colspan="5" class="text-center">검색어를 입력하고 검색 버튼을 누르세요.</td></tr>`;
        } catch (error) {
            console.error('제품 데이터를 불러오는 중 오류 발생:', error);
            errorMessageDiv.textContent = '데이터를 불러오는 데 실패했습니다. (Failed to fetch)';
            errorMessageDiv.style.display = 'block';
        }
    }

    function renderResults(results) {
        resultsTableBody.innerHTML = '';
        errorMessageDiv.style.display = 'none';

        const profitMargin = parseFloat(discountRateInput.value) || 0;

        if (results.length > 0) {
            results.forEach(item => {
                const basePriceStr = item['가격'] || '0';
                const basePrice = parseFloat(basePriceStr.replace(/,/g, ''));
                let calculatedDisplayPrice = 'N/A';
                let formattedBasePrice = 'N/A';

                if (!isNaN(basePrice)) {
                    formattedBasePrice = basePrice.toLocaleString('ko-KR');
                    if (profitMargin > 0) {
                        const divisor = (1 - profitMargin / 100);
                        if (divisor > 0) {
                            let sellingPrice = basePrice / divisor;
                            // Round to the nearest 1000 (사사오입)
                            sellingPrice = Math.round(sellingPrice / 1000) * 1000;
                            calculatedDisplayPrice = sellingPrice.toLocaleString('ko-KR');
                        } else {
                            calculatedDisplayPrice = '이익률 초과';
                        }
                    } else if (profitMargin === 0) {
                        calculatedDisplayPrice = formattedBasePrice;
                    } else {
                        calculatedDisplayPrice = '유효하지 않은 이익률';
                    }
                }
                
                const row = resultsTableBody.insertRow();
                row.dataset.code = item['품목코드'];
                row.classList.add('clickable-row');

                const shareButton = `<button class="btn btn-sm btn-outline-secondary share-btn" data-name="${item['품목명']}" data-price="${calculatedDisplayPrice}">공유</button>`;

                row.innerHTML = `
                    <td data-label="품목코드">${item['품목코드'] || 'N/A'}</td>
                    <td data-label="규격">${item['품목명'] || 'N/A'}</td>
                    <td data-label="가격">${formattedBasePrice}</td>
                    <td data-label="견적가">${calculatedDisplayPrice}</td>
                    <td data-label="공유">${shareButton}</td>
                `;
            });
        } else {
             if (searchInput.value) {
                errorMessageDiv.textContent = '해당 검색어와 일치하는 제품을 찾을 수 없습니다.';
                errorMessageDiv.style.display = 'block';
            }
        }
    }

    function searchProducts() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        if (!searchTerm) {
            errorMessageDiv.textContent = '검색어를 입력해주세요.';
            errorMessageDiv.style.display = 'block';
            currentResults = [];
            renderResults(currentResults);
            return;
        }

        currentResults = productData.filter(item => {
            const itemCode = item['품목코드'] ? String(item['품목코드']).toLowerCase() : '';
            const itemName = item['품목명'] ? String(item['품목명']).toLowerCase() : '';
            return itemCode.includes(searchTerm) || itemName.includes(searchTerm);
        });

        renderResults(currentResults);
    }

    // Voice search functionality
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'ko-KR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        voiceSearchButton.addEventListener('click', () => {
            errorMessageDiv.style.display = 'none';
            searchInput.value = '';
            voiceSearchButton.disabled = true;
            micIcon.style.display = 'none';
            voiceSearchText.style.display = 'inline';
            voiceSearchText.textContent = '말씀해주세요...';
            recognition.stop();
            recognition.start();
        });

        recognition.onresult = (event) => {
            const speechResult = event.results[0][0].transcript;
            const processedSpeechResult = speechResult.replace(/[-\s]/g, '');
            searchInput.value = processedSpeechResult;
            searchProducts();
        };

        recognition.onspeechend = () => {
            voiceSearchButton.disabled = false;
            micIcon.style.display = 'inline';
            voiceSearchText.style.display = 'none';
            voiceSearchText.textContent = '';
            recognition.stop();
        };

        recognition.onerror = (event) => {
            voiceSearchButton.disabled = false;
            micIcon.style.display = 'inline';
            voiceSearchText.style.display = 'none';
            voiceSearchText.textContent = '';
            errorMessageDiv.textContent = `음성 인식 오류: ${event.error}`;
            errorMessageDiv.style.display = 'block';
            console.error('Speech recognition error:', event.error);
            recognition.stop();
        };
    }

    // Event listener delegation for row clicks and share button clicks
    resultsTableBody.addEventListener('click', (event) => {
        const shareButton = event.target.closest('.share-btn');
        const row = event.target.closest('tr.clickable-row');

        if (shareButton) {
            event.stopPropagation(); // Prevent row click event when share button is clicked
            const name = shareButton.dataset.name;
            const price = shareButton.dataset.price;
            const textToCopy = `규격: ${name}\n견적가: ${price}원`;

            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = shareButton.textContent;
                shareButton.textContent = '복사됨!';
                shareButton.disabled = true;
                setTimeout(() => {
                    shareButton.textContent = originalText;
                    shareButton.disabled = false;
                }, 1500);
            }).catch(err => {
                console.error('클립보드 복사 실패:', err);
                alert('클립보드 복사에 실패했습니다.');
            });

        } else if (row && row.dataset.code) {
            const productCode = row.dataset.code;
            const selectedProduct = productData.find(item => item['품목코드'] === productCode);
            if (selectedProduct) {
                renderResults([selectedProduct]);
            }
        }
    });

    searchButton.addEventListener('click', searchProducts);
    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            searchProducts();
        }
    });

    discountRateInput.addEventListener('input', () => {
        renderResults(currentResults);
    });

    loadProductData();