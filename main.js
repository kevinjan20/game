// Firebase 相關的 import
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// 更改這裡：從 firestore 換成 database
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";


// 全域 Firebase 變數
let app;
let database; // 更改這裡：從 db 換成 database (或維持 db，但確保是 Realtime Database 實例)
let auth;
let userId; // 將在 Firebase 認證後設定

// 從 firebaseConfig 中獲取專案 ID 作為 appId，用於資料路徑
const firebaseConfig = {
  apiKey: "AIzaSyBYuvt87NR5vKD-g2M3wDIHLtST3J3SbKw",
  authDomain: "game-11029.firebaseapp.com",
  databaseURL: "https://game-11029-default-rtdb.firebaseio.com", // 確保這是 Realtime Database 的 URL
  projectId: "game-11029",
  storageBucket: "game-11029.firebasestorage.app",
  messagingSenderId: "157272337864",
  appId: "1:157272337864:web:3731d8048395b3997f64fd",
  measurementId: "G-C09V5DECRD"
};
const appId = firebaseConfig.projectId; // 使用 projectId 作為應用程式 ID 在資料庫路徑中使用

// 將需要從 HTML 中直接呼叫的函式綁定到 window 物件
// 這樣即使 main.js 作為模組載入，這些函式也能被全域訪問
window.startGame = startGame;
window.submitName = submitName;
window.attack = attack;
window.leaveBattle = leaveBattle;
window.restartGame = restartGame;
window.buyPotion = buyPotion;
window.buyLargePotion = buyLargePotion;
window.sellWeapon = sellWeapon; // 請注意：你的 HTML 中可能寫的是 sellWeapons()，但 JS 函式是 sellWeapon()
window.equipWeapon = equipWeapon; // 如果有直接從 HTML 呼叫這個，請保留
window.equipWeaponByName = equipWeaponByName;
window.dropWeaponFromInventory = dropWeaponFromInventory;
window.usePotion = usePotion;
window.useLargePotion = useLargePotion;
// window.levelUp = levelUp; // levelUp 應該是內部呼叫，不需要綁定到 window
window.goToTown = goToTown;
window.enterShop = enterShop;
window.goToForest = goToForest;
window.goToHill = goToHill;
window.goToCave = goToCave;
window.goToWarriorVillage = goToWarriorVillage;
window.goToWarriorPlain = goToWarriorPlain;
window.goToBoneMine = goToBoneMine;
window.goToRuneTemple = goToRuneTemple;
window.goToPerion = goToPerion;
window.goToSubway = goToSubway;
window.startBossBattle = startBossBattle;
window.startBattle = startBattle;
window.goToAbyssalRift = goToAbyssalRift;
window.goToAncientLibrary = goToAncientLibrary;


let player = {
    name: "小勇者",
    job: "戰士",
    level: 1,
    hp: 100,
    maxHp: 100,
    exp: 0,
    expToLevel: 100,
    attackBase: 5, // 基礎攻擊力
    weapon: {
        name: "木棍",
        power: 0,
        rarity: "普通"
    },
    inventory: [], // 背包（武器）
    potions: 3, // 初始藥水數量
    largePotions: 1, // 初始大藥水數量，這裡先設定為 1 瓶，你可以根據需求調整
    gold: 50, // 初始金幣
    // 使用物件追蹤每個 Boss 的擊敗狀態，方便擴展
    bossStatus: {
        forestBoss: { defeated: false, fragmentObtained: false },
        warriorBoss: { defeated: false, fragmentObtained: false },
        perionBoss: { defeated: false, fragmentObtained: false },
        finalBoss: { defeated: false }
    },
    // 或者用陣列來追蹤已收集的碎片 ID
    magicFragments: [], // 例如：['forestFragment', 'hillFragment']
};


const weaponPool = [
    { name: "破銅劍", power: 2, rarity: "普通", chance: 0.4 },
    { name: "鋒利長劍", power: 5, rarity: "稀有", chance: 0.3 },
    { name: "火焰之刃", power: 10, rarity: "傳說", chance: 0.1 }
];

const weaponPoolHill = [
   { name: "生鏽的斧頭", power: 6, rarity: "普通", chance: 0.35 },
   { name: "野豬獠牙", power: 8, rarity: "普通", chance: 0.25 },
   { name: "狂怒野豬牙刃", power: 15, rarity: "傳說", chance: 0.1 }
];

const weaponPoolCave = [
  { name: "蝙蝠之翼", power: 10, rarity: "普通", chance: 0.25 },
  { name: "夜翼飛刃", power: 15, rarity: "稀有", chance: 0.2 },
  { name: "暗夜蝠王之刃", power: 20, rarity: "傳說", chance: 0.1 }
];

const weaponPoolWarriorPlain = [
    { name: "戰士之刃", power: 20, rarity: "稀有", chance: 0.3 },
    { name: "榮耀之劍", power: 25, rarity: "稀有", chance: 0.2 },
    { name: "巨人之斧", power: 28, rarity: "傳說", chance: 0.1 }
];

const weaponPoolBoneMine = [
    { name: "生鏽的鎬子", power: 18, rarity: "普通", chance: 0.4 },
    { name: "淬鍊石錘", power: 25, rarity: "稀有", chance: 0.3 },
    { name: "骸骨利刃", power: 35, rarity: "稀有", chance: 0.2 },
    { name: "地心鑽頭", power: 45, rarity: "傳說", chance: 0.1 }
];

const weaponPoolRuneTemple = [
    { name: "符文匕首", power: 20, rarity: "普通", chance: 0.35 },
    { name: "秘術法杖", power: 30, rarity: "稀有", chance: 0.3 },
    { name: "聖光巨劍", power: 40, rarity: "稀有", chance: 0.2 },
    { name: "古神語錄", power: 50, rarity: "傳說", chance: 0.1 }, // 魔法書類的武器
    { name: "毀滅符文之刃", power: 60, rarity: "傳說", chance: 0.05 } // 更稀有的傳說武器
];

const weaponPoolSubway = [
    { name: "生鏽的扳手", power: 25, rarity: "普通", chance: 0.35 },
    { name: "警棍", power: 35, rarity: "稀有", chance: 0.3 },
    { name: "軌道切割者", power: 45, rarity: "稀有", chance: 0.2 },
    { name: "磁力炮", power: 55, rarity: "傳說", chance: 0.1 },
    { name: "城市破壞者", power: 65, rarity: "傳說", chance: 0.05 }
];

const weaponPoolAbyssalRift = [
    { name: "影刃", power: 40, rarity: "普通", chance: 0.3 },
    { name: "虛空之杖", power: 55, rarity: "稀有", chance: 0.25 },
    { name: "末日戰斧", power: 70, rarity: "稀有", chance: 0.2 },
    { name: "深淵之眼", power: 85, rarity: "傳說", chance: 0.1 },
    { name: "混沌之劍", power: 100, rarity: "傳說", chance: 0.05 }
];

const weaponPoolAncientLibrary = [
    { name: "智慧之書", power: 50, rarity: "普通", chance: 0.3 },
    { name: "秘法卷軸", power: 65, rarity: "稀有", chance: 0.25 },
    { name: "真理法杖", power: 80, rarity: "稀有", chance: 0.2 },
    { name: "星辰之筆", power: 95, rarity: "傳說", chance: 0.1 },
    { name: "宇宙真言", power: 110, rarity: "傳說", chance: 0.05 }
];

const monstersByArea = {
  forest: {
    name: "綠水靈",
    hp: 30,
    attackMin: 3,
    attackMax: 7,
    exp: 20,
    weaponPool: weaponPool
  },
  hill: {
    name: "野豬",
    hp: 60,
    attackMin: 8,
    attackMax: 12,
    exp: 40,
    weaponPool: weaponPoolHill
  },
  cave: {
    name: "黑暗蝙蝠",
    hp: 100,
    attackMin: 13,
    attackMax: 20,
    exp: 60,
    weaponPool: weaponPoolCave  
  },
 warriorPlain: { 
        name: "木妖",
        hp: 150,
        attackMin: 18,
        attackMax: 28,
        exp: 80,
        weaponPool: weaponPoolWarriorPlain 
    },
boneMine: { // 新增的枯骨礦坑小怪
        name: "礦工殭屍",
        hp: 200,
        attackMin: 22,
        attackMax: 35,
        exp: 100,
        weaponPool: weaponPoolBoneMine // 使用新的武器池
    },
runeTemple: { // 符文守衛作為主要怪物
        name: "符文守衛",
        hp: 300,
        attackMin: 25,
        attackMax: 40,
        exp: 150,
        weaponPool: weaponPoolRuneTemple
    },
subway: { // 廢棄地鐵站的主要怪物
        name: "流氓",
        hp: 350,
        attackMin: 30,
        attackMax: 50,
        exp: 180,
        weaponPool: weaponPoolSubway
    },
shadowHound: {
        name: "暗影獵犬",
        hp: 450,
        attackMin: 40,
        attackMax: 65,
        exp: 220,
        weaponPool: weaponPoolAbyssalRift
    },
pageSprite: {
        name: "書頁精靈",
        hp: 500,
        attackMin: 45,
        attackMax: 70,
        exp: 280,
        weaponPool: weaponPoolAncientLibrary
    },
};

// Boss 專屬武器掉落池
const weaponPoolBossForest = [
    { name: "自然之杖", power: 20, rarity: "傳說", chance: 1, healOnAttack: 5 }
];

const weaponPoolBossHill = [
    { name: "碎岩者巨錘", power: 30, rarity: "傳說", chance: 1, stunChance: 0.2 } // 新增 stunChance 屬性
];

const weaponPoolBossPerion = [
    { name: "劇毒之爪", power: 40, rarity: "傳說", chance: 1, poisonChance: 0.3 } // 攻擊有30%機率使敵人中毒
];

const weaponPoolFinalBoss = [
    { name: "世界毀滅者", power: 50, rarity: "傳說", chance: 0.05 },
    { name: "創世之手套", power: 45, rarity: "傳說", chance: 0.03 }
];

const gameBosses = {
    forestBoss: {
        id: 'forestBoss',
        name: "菇菇寶貝",
        hp: 300,
        attackMin: 15,
        attackMax: 25,
        exp: 300,
        weaponPool: weaponPoolBossForest,
        fragmentId: 'forestFragment' // 新增碎片ID
    },
   warriorBoss: {
        id: 'warriorBoss',
        name: "岩魔",
        hp: 600,
        attackMin: 30,
        attackMax: 40,
        exp: 600,
        weaponPool: weaponPoolBossHill,
        fragmentId: 'warriorFragment'
    },
    perionBoss: { // 墮落城市的Boss
        id: 'perionBoss',
        name: "毒氣骷髏王",
        hp: 700, // 更高的血量
        attackMin: 35,
        attackMax: 55,
        exp: 1200,
        isBoss: true,
        weaponPool: weaponPoolBossPerion, // 使用新的Boss武器池
        fragmentId: 'perionFragment', // 假設擊敗掉落墮落城市碎片
        poisonAttackChance: 0.7 // Boss攻擊有70%機率讓玩家中毒
    },
    finalBoss: {
        id: 'finalBoss',
        name: "黑魔法師",
        hp: 1000,
        attackMin: 40,
        attackMax: 60,
        exp: 2000,
        weaponPool: weaponPoolFinalBoss,
        requiredFragments: ['forestFragment', 'warriorFragment', 'perionFragment'] // 挑戰魔王所需碎片
    }
};

const potionDropRate = 0.5;
const potionHealAmount = 20;
const potionBuyPrice = 10; // 商店藥水價格

// 新增大藥水相關常數
const largePotionHealAmount = 120; // 大藥水回復量
const largePotionBuyPrice = 50; // 大藥水購買價格

// Firebase 初始化和認證
async function initFirebaseAndAuth() {
    try {
        app = initializeApp(firebaseConfig);
        database = getDatabase(app);
        auth = getAuth(app);

        onAuthStateChanged(auth, async (user) => {
    if (user) {
        userId = user.uid;
        console.log("Firebase Auth Ready. User ID:", userId);
        
        // 嘗試從 Firebase 載入玩家資料
        const dataLoaded = await loadPlayerData();

        // 無論是否有資料，都先顯示歡迎畫面
        document.getElementById("game-intro").style.display = "block";

        // 記錄是否為新玩家（供 startGame 判斷用）
        window.__isNewPlayer = !dataLoaded;
    } else {
        try {
            if (typeof __initial_auth_token !== 'undefined') {
                await signInWithCustomToken(auth, __initial_auth_token);
            } else {
                await signInAnonymously(auth);
            }
        } catch (error) {
            console.error("Firebase 匿名登入失敗:", error);
            document.getElementById("game-intro").textContent = "錯誤：無法連接遊戲服務。請重試。";
            document.getElementById("game-intro").style.display = "block";
        }
    }
});

    } catch (error) {
        console.error("Firebase 初始化失敗:", error);
        document.getElementById("game-intro").textContent = "錯誤：遊戲服務無法初始化。";
        document.getElementById("game-intro").style.display = "block"; // 確保錯誤時也顯示
    }
}

// 儲存玩家資料到 Realtime Database
async function savePlayerData() {
    if (!database || !userId) {
        console.error("Realtime Database 或使用者 ID 未準備好。無法儲存資料。");
        return;
    }
    try {
        const playerRef = ref(database, `artifacts/${appId}/users/${userId}/playerData`);
        await set(playerRef, player);
        console.log("玩家資料儲存成功！");
    } catch (e) {
        console.error("儲存玩家資料時出錯: ", e);
    }
}

// 從 Realtime Database 載入玩家資料
// 從 Realtime Database 載入玩家資料
async function loadPlayerData() {
    if (!database || !userId) {
        console.error("Realtime Database 或使用者 ID 未準備好。無法載入資料。");
        return false;
    }
    try {
        const playerRef = ref(database, `artifacts/${appId}/users/${userId}/playerData`);
        const snapshot = await get(playerRef);

        if (snapshot.exists()) {
            const loadedData = snapshot.val();
            console.log("原始載入資料 (loadPlayerData):", loadedData); // 除錯日誌

            // 儲存載入資料中裝備武器的名稱
            const equippedWeaponNameFromLoadedData = loadedData.weapon ? loadedData.weapon.name : null;

            // 合併載入的資料，確保所有屬性都更新
            // 注意：這裡直接賦值會導致 player.weapon 變成一個新的物件實例
            Object.assign(player, loadedData);

            // 重新連結 player.weapon 到 player.inventory 中的正確物件實例
            // 只有當載入的裝備武器不是預設的「木棍」時才需要重新連結
            if (equippedWeaponNameFromLoadedData && equippedWeaponNameFromLoadedData !== "木棍") {
                const equippedInInventory = player.inventory.find(item => item.name === equippedWeaponNameFromLoadedData);
                if (equippedInInventory) {
                    player.weapon = equippedInInventory; // 將 player.weapon 指向背包中的實際物件
                    console.log("重新連結裝備中的武器到背包實例:", player.weapon.name);
                } else {
                    // 如果載入的裝備武器在背包中找不到，則重設為預設武器
                    player.weapon = { name: "木棍", power: 0, rarity: "普通" };
                    console.warn("載入的裝備武器在背包中找不到。重設為預設木棍。");
                }
            } else {
                // 如果載入的裝備武器是預設木棍，確保 player.weapon 也是預設值
                player.weapon = { name: "木棍", power: 0, rarity: "普通" };
            }


            // 額外檢查並確保 player.name 被正確設定
            if (loadedData.name && typeof loadedData.name === 'string' && loadedData.name.trim() !== "") {
                player.name = loadedData.name.trim();
            } else {
                console.warn("載入的玩家資料中沒有有效名稱，將使用現有名稱或預設名稱。");
            }

            console.log("玩家資料載入成功！當前玩家名稱:", player.name); // 除錯日誌
            log(`歡迎回來，${player.name}！你的遊戲進度已載入。`);
            
            return true;
        } else {
            console.log("沒有找到玩家資料，開始新遊戲流程。");
            return false;
        }
    } catch (e) {
        console.error("載入玩家資料時出錯: ", e);
        return false;
    }
}
function getPlayerAttack() {
    return player.attackBase + (player.weapon ? player.weapon.power : 0);
}

function updateStatus() {
    let fragmentList = player.magicFragments.length > 0 ? player.magicFragments.map(f => {
        // 可以根據 fragmentId 顯示更友善的名稱
        switch(f) {
            case 'forestFragment': return '森林碎片';
            case 'warriorFragment': return '勇士碎片';
            case 'perionFragment': return '城市碎片';
            default: return f;
        }
    }).join(', ') : '無';

    document.getElementById("status").innerHTML = `
        <strong>角色資訊：</strong><br>
        名字：${player.name}<br>
        職業：${player.job}<br>
        等級：${player.level}<br>
        HP：${player.hp} / ${player.maxHp}<br>
        EXP：${player.exp} / ${player.expToLevel}<br>
        攻擊力：${getPlayerAttack()}（基礎：${player.attackBase}，武器：${player.weapon ? player.weapon.name + " +" + player.weapon.power : '無'}）<br>
        金幣：${player.gold}<br>
        <strong>魔法碎片：</strong> ${fragmentList}
    `;
    updateInventory();
}

function updateInventory() {
    const inventoryDiv = document.getElementById("inventory");
    inventoryDiv.innerHTML = '';

    const weaponCounts = {};
    player.inventory.forEach(item => {
        if (weaponCounts[item.name]) {
            weaponCounts[item.name].count++;
            weaponCounts[item.name].items.push(item);
        } else {
            weaponCounts[item.name] = { ...item, count: 1, items: [item] };
        }
    });

    if (Object.keys(weaponCounts).length > 0) {
        inventoryDiv.innerHTML += '<strong>武器：</strong><br>';
        Object.values(weaponCounts).forEach((countedItem, index) => {
            const displayCount = countedItem.count > 1 ? `（x${countedItem.count}）` : '';
            const firstItem = countedItem.items[0];
            // *** 這裡的修改：比較武器名稱而不是物件實例 ***
            const isEquipped = player.weapon && player.weapon.name === firstItem.name;
            const dropButton = isEquipped ? '' : `<button onclick="dropWeaponFromInventory('${firstItem.name}')">丟棄</button>`;
            const equipButton = isEquipped ? '已裝備' : `<button onclick="equipWeaponByName('${firstItem.name}')">裝備</button>`;

            inventoryDiv.innerHTML += `
                ${index + 1}. 【${firstItem.name}${displayCount}】（${firstItem.rarity}，攻擊 +${firstItem.power}）
                ${equipButton}
                ${dropButton}
                <br>
            `;
        });
    } else {
        inventoryDiv.innerHTML += '<strong>武器：</strong><br>（背包是空的）<br>';
    }

    inventoryDiv.innerHTML += `<br><strong>藥水(回復${potionHealAmount}hp)：</strong> ${player.potions} 瓶 <button onclick="usePotion()">使用藥水</button>`;
    inventoryDiv.innerHTML += `<br><strong>大藥水(回復${largePotionHealAmount}hp)：</strong> ${player.largePotions} 瓶 <button onclick="useLargePotion()">使用大藥水</button>`;
}

function log(text) {
    const logBox = document.getElementById("log-content");
    logBox.textContent += text + "\n";
    logBox.scrollTop = logBox.scrollHeight;
}

function goToTown() {
    document.getElementById("battle").style.display = "none";
    document.getElementById("location").style.display = "block"; // 確保 location 區塊顯示
    let locationHtml = `<strong>你目前在：</strong> 弓箭手村<br>`;

    
    locationHtml += `<button onclick="enterShop('town')" id="shopButton">前往商店</button>`;
    locationHtml += `<button onclick="goToForest()">前往綠水靈森林</button>`;

    // 挑戰第一個 Boss
    if (!player.bossStatus.forestBoss.defeated) {
        locationHtml += `<button onclick="startBossBattle('forestBoss')">挑戰菇菇寶貝王！</button>`;
    } else {
        locationHtml += `<p>菇菇寶貝王已被擊敗。</p>`;
    }

    // 檢查是否收集了所有碎片，如果收集齊全，顯示挑戰最終魔王的按鈕
    const hasAllFragments = gameBosses.finalBoss.requiredFragments.every(
        fragmentId => player.magicFragments.includes(fragmentId)
    );

    if (hasAllFragments && !player.bossStatus.finalBoss.defeated) {
        locationHtml += `<button onclick="startBossBattle('finalBoss')">挑戰最終魔王：黑魔法師！</button>`;
    } else if (player.bossStatus.finalBoss.defeated) {
        locationHtml += `<p>你已擊敗黑魔法師，世界獲得了和平！</p>`;
    } else if (player.bossStatus.forestBoss.defeated && !hasAllFragments) {
        // 如果第一個 Boss 擊敗了，但還沒收集齊碎片，提示還需要收集
        locationHtml += `<p>你需要收集所有魔法碎片才能挑戰最終魔王。</p>`;
    }

    document.getElementById("location").innerHTML = locationHtml;
    log("你回到了弓箭手村。");
    savePlayerData();
}

let shopEntryLocation = 'town'; // 全域變數，只宣告一次

function enterShop(fromLocation) {
    console.log("進入 enterShop 函式...");
    console.log("接收到的 fromLocation 參數:", fromLocation);

    if (fromLocation !== undefined && fromLocation !== null) {
        shopEntryLocation = fromLocation;
    }
    console.log("更新後的 shopEntryLocation:", shopEntryLocation);

    let shopHtml = `
        <strong>你目前在：</strong> 商店<br>
        <button onclick="buyPotion()">購買藥水（${potionBuyPrice}金幣，回復${potionHealAmount}HP）</button><br>
        <button onclick="buyLargePotion()">購買大藥水（${largePotionHealAmount}金幣，回復${largePotionHealAmount}HP）</button>
        <br><br>
        <strong>出售裝備：</strong><br>
    `;

    const sellableWeapons = {}; // 用於儲存可出售的武器及其數量

    player.inventory.forEach((item) => {
        // 只有當前物品不是裝備中的武器實例時，才將其加入可出售列表
        // 這裡的判斷 now relies on player.weapon being the exact instance from inventory
        if (player.weapon !== item) { 
            if (sellableWeapons[item.name]) {
                sellableWeapons[item.name].count++;
            } else {
                sellableWeapons[item.name] = {
                    count: 1,
                    weaponObject: item // 儲存一個武器物件的參考，用於顯示屬性
                };
            }
        }
    });

    if (Object.keys(sellableWeapons).length === 0) {
        shopHtml += "你沒有裝備可賣。<br>";
    } else {
        Object.values(sellableWeapons).forEach((data) => {
            const weapon = data.weaponObject;
            const sellPrice = getSellPrice(weapon.rarity);
            const displayCount = data.count > 1 ? `（x${data.count}）` : '';
            shopHtml += `
                【${weapon.name}${displayCount}】（${weapon.rarity}，攻擊 +${weapon.power}，賣價：${sellPrice}金幣）
                <button onclick="sellWeapon('${weapon.name}')">賣出</button><br>
            `;
        });
    }

    let returnButton = '';
    if (shopEntryLocation === 'warrior') {
        returnButton = `<button onclick="goToWarriorVillage()">離開商店</button>`;
        log("你進入了商店。");
    } else if (shopEntryLocation === 'perion') {
        returnButton = `<button onclick="goToPerion()">離開商店</button>`;
        log("你進入了商店。");
    } else {
        returnButton = `<button onclick="goToTown()">離開商店</button>`;
        log("你進入了商店。");
    }

    shopHtml += `<br>${returnButton}`;
    document.getElementById("location").innerHTML = shopHtml;
    savePlayerData();
}

function buyPotion() {
    if (player.gold >= potionBuyPrice) {
        player.gold -= potionBuyPrice;
        player.potions++;
        log("你購買了一瓶藥水！");
    } else {
        log("金幣不足！");
    }
    updateStatus();
    enterShop(); // <-- 不再傳遞參數
}

function buyLargePotion() {
    if (player.gold >= largePotionBuyPrice) {
        player.gold -= largePotionBuyPrice;
        player.largePotions++;
        log("你購買了一瓶大藥水！");
    } else {
        log("金幣不足！");
    }
    updateStatus();
    enterShop(); // <-- 不再傳遞參數
}


function getSellPrice(rarity) {
    switch (rarity) {
        case "普通":
            return 5;
        case "稀有":
            return 15; // 提高稀有武器賣價
        case "傳說":
            return 50;
        default:
            return 1;
    }
}

// 修改 sellWeapon 函式，接收武器名稱
function sellWeapon(weaponName) {
    // 尋找背包中第一個 "未裝備" 且名稱匹配的武器
    let foundIndex = -1;
    for (let i = 0; i < player.inventory.length; i++) {
        // 確保是同名武器，且不是當前裝備的那個物件實例
        if (player.inventory[i].name === weaponName && player.inventory[i] !== player.weapon) {
            foundIndex = i;
            break;
        }
    }

    if (foundIndex !== -1) {
        const weapon = player.inventory[foundIndex];
        const sellPrice = getSellPrice(weapon.rarity);

        player.gold += sellPrice;
        player.inventory.splice(foundIndex, 1); // 只移除一個實例
        log(`你賣掉了【${weapon.name}】，獲得了 ${sellPrice} 金幣！`);

        updateStatus();
        enterShop(); // 重新渲染商店列表
        savePlayerData();
    } else {
        // 理論上如果 UI 篩選正確，這個分支不應該被觸發
        log("找不到可賣出的武器或該武器正在裝備中。");
    }
}

function goToForest() {
    document.getElementById("battle").style.display = "none";
    document.getElementById("location").innerHTML = `
        <strong>你目前在：</strong> 綠水靈森林<br>
        <button onclick="startBattle('forest')">遇怪！</button>
        <button onclick="goToHill()">前往野豬山丘</button>
        <button onclick="goToTown()">返回弓箭手村</button>
    `;
    log("你進入了綠水靈森林。");
    savePlayerData();
}



function goToHill() {
    document.getElementById("battle").style.display = "none";
    document.getElementById("location").innerHTML = `
        <strong>你目前在：</strong> 野豬山丘<br>
        <button onclick="startBattle('hill')">遇怪！</button>
        <button onclick="goToCave()">前往黑岩洞窟</button>
        <button onclick="goToForest()">返回綠水靈森林</button>       
    `;
    log("你進入了野豬山丘");
    savePlayerData();
}

function goToCave() {
    document.getElementById("battle").style.display = "none";
    document.getElementById("location").innerHTML = `
        <strong>你目前在：</strong> 黑岩洞窟<br>
        <button onclick="startBattle('cave')">遇怪！</button>
        <button onclick="goToWarriorVillage()">前往勇士之村</button>
        <button onclick="goToHill()">返回野豬山丘</button>
    `;
    log("你進入了黑岩洞窟");
    savePlayerData();
}

// main.js

function goToWarriorVillage() {
    document.getElementById("battle").style.display = "none"; // 離開戰鬥介面
    document.getElementById("location").style.display = "block"; // 確保 location 區塊顯示
    let locationHtml = `
        <strong>你目前在：</strong> 勇士之村<br>
        
         <button onclick="enterShop('warrior')" id="shopButton">前往商店</button> 
         <button onclick="goToWarriorPlain()">前往勇士平原</button>
         <button onclick="goToCave()">返回黑岩洞窟</button> `;

    // 處理勇士之村的 Boss: 石巨人
    if (!player.bossStatus.warriorBoss.defeated) {
        locationHtml += `<button onclick="startBossBattle('warriorBoss')">挑戰岩魔！</button>`;
    } else {
        locationHtml += `<p>岩魔已被擊敗。</p>`;
    }

    // --- 複製自弓箭手村的 Boss 邏輯開始 ---

    // 檢查是否收集了所有碎片，如果收集齊全，顯示挑戰最終魔王的按鈕
    const allFragmentsCollected = gameBosses.finalBoss.requiredFragments.every(
        fragmentId => player.magicFragments.includes(fragmentId)
    );

    if (allFragmentsCollected && !player.bossStatus.finalBoss.defeated) {
        // 如果所有碎片都收集齊全且最終魔王尚未擊敗，顯示挑戰按鈕
        locationHtml += `<button onclick="startBossBattle('finalBoss')">挑戰最終魔王：黑魔法師！</button>`;
    } else if (player.bossStatus.finalBoss.defeated) {
        // 如果最終魔王已被擊敗
        locationHtml += `<p>你已擊敗黑魔法師，世界獲得了和平！</p>`;
    } else if (player.bossStatus.warriorBoss.defeated && !allFragmentsCollected) {
        // 如果勇士村 Boss 已擊敗，但還沒收集齊所有碎片，提示還需要收集
        // 這裡的提示詞可以根據遊戲設計調整，提示玩家去其他地方找碎片
        locationHtml += `<p>你需要收集所有魔法碎片才能挑戰最終魔王。</p>`;
    }

    // --- 複製自弓箭手村的 Boss 邏輯結束 ---

    document.getElementById("location").innerHTML = locationHtml;
    log("你來到了勇士之村。");
    savePlayerData();
}

function goToWarriorPlain() {
    document.getElementById("battle").style.display = "none";
    document.getElementById("location").innerHTML = `
        <strong>你目前在：</strong> 勇士平原<br>
        <button onclick="startBattle('warriorPlain')">遇怪！</button>
        <button onclick="goToBoneMine()">前往枯骨礦坑</button>
        <button onclick="goToWarriorVillage()">返回勇士之村</button>
    `;
    log("你進入了勇士平原。");
    savePlayerData();
}

function goToBoneMine() {
    document.getElementById("battle").style.display = "none";
    document.getElementById("location").style.display = "block"; // 確保 location 區塊顯示

    document.getElementById("location").innerHTML = `
        <strong>你目前在：</strong> 枯骨礦坑<br>
        <button onclick="startBattle('boneMine')">遇怪！</button>
        <button onclick="goToRuneTemple()">前往古老符文殿堂</button> 
        <button onclick="goToWarriorPlain()">返回勇士平原</button>
    `;
    log("你進入了枯骨礦坑。");
    savePlayerData();
}

function goToRuneTemple() {
    document.getElementById("battle").style.display = "none";
    document.getElementById("location").style.display = "block"; // 確保 location 區塊顯示

    document.getElementById("location").innerHTML = `
        <strong>你目前在：</strong> 古老符文殿堂<br>
        <button onclick="startBattle('runeTemple')">遇怪！</button>
        <button onclick="goToPerion()">前往墮落城市</button>
        <button onclick="goToBoneMine()">返回枯骨礦坑</button>

    `;
    log("你進入了古老符文殿堂。");
    savePlayerData();
}

function goToPerion() { // 將 Perion 用作墮落城市的名稱
    document.getElementById("battle").style.display = "none";
    document.getElementById("location").style.display = "block";

    let locationHtml = `
        <strong>你目前在：</strong> 墮落城市<br>
        <button onclick="enterShop('perion')" id="shopButtonPerion">前往商店</button>
        <button onclick="goToSubway()">前往廢棄地鐵站</button>
         <button onclick="goToRuneTemple()">返回古老符文殿堂</button>
        `;

    // --- Boss 挑戰按鈕邏輯 ---
    if (!player.bossStatus.perionBoss.defeated) {
        locationHtml += `<button onclick="startBossBattle('perionBoss')">挑戰毒氣骷髏王！</button>`;
    } else {
        locationHtml += `<p>毒氣骷髏王已被擊敗。</p>`;
    }

    // 最終魔王挑戰邏輯 (保持不變，會檢查所有碎片)
     const allFragmentsCollected = gameBosses.finalBoss.requiredFragments.every(
        fragmentId => player.magicFragments.includes(fragmentId)
    );

    if (allFragmentsCollected && !player.bossStatus.finalBoss.defeated) {
        // 如果所有碎片都收集齊全且最終魔王尚未擊敗，顯示挑戰按鈕
        locationHtml += `<button onclick="startBossBattle('finalBoss')">挑戰最終魔王：黑魔法師！</button>`;
    } else if (player.bossStatus.finalBoss.defeated) {
        // 如果最終魔王已被擊敗
        locationHtml += `<p>你已擊敗黑魔法師，世界獲得了和平！</p>`;
    } else if (player.bossStatus.warriorBoss.defeated && !allFragmentsCollected) {
        // 如果勇士村 Boss 已擊敗，但還沒收集齊所有碎片，提示還需要收集
        // 這裡的提示詞可以根據遊戲設計調整，提示玩家去其他地方找碎片
        locationHtml += `<p>你需要收集所有魔法碎片才能挑戰最終魔王。</p>`;
    }

    document.getElementById("location").innerHTML = locationHtml;
    log("你來到了墮落城市。");
    savePlayerData();
}


function goToSubway() {
    document.getElementById("battle").style.display = "none";
    document.getElementById("location").style.display = "block";

    document.getElementById("location").innerHTML = `
        <strong>你目前在：</strong> 廢棄地鐵站<br>
        <button onclick="startBattle('subway')">遇怪！</button>
        <button onclick="goToAbyssalRift()">前往深淵裂縫</button>
        <button onclick="goToPerion()">返回墮落城市</button>
    `;
    log("你進入了廢棄地鐵站。");
    savePlayerData();
}

function goToAbyssalRift() {
    document.getElementById("battle").style.display = "none";
    document.getElementById("location").style.display = "block";

    document.getElementById("location").innerHTML = `
        <strong>你目前在：</strong> 深淵裂縫<br>
        <button onclick="startBattle('shadowHound')">遇怪！</button>
        <button onclick="goToAncientLibrary()">前往古老圖書館</button>
        <button onclick="goToSubway()">返回廢棄地鐵站</button>
    `;
    log("你進入了深淵裂縫。");
    savePlayerData();
}

function goToAncientLibrary() {
    document.getElementById("battle").style.display = "none";
    document.getElementById("location").style.display = "block";
    
    document.getElementById("location").innerHTML = `
        <strong>你目前在：</strong> 古老圖書館<br>
        <button onclick="startBattle('pageSprite')">遇怪！</button>
        <button onclick="goToAbyssalRift()">返回深淵裂縫</button>
    `;
    log("你進入了古老圖書館。");
    savePlayerData();
}

let currentMonster = null;

// 將 currentBattleArea 從 'boss' 擴展為 Boss 的 ID
let currentBattleArea = null; // 可以是 'forest', 'hill', 'cave', 'forestBoss', 'hillBoss', 'caveBoss', 'finalBoss'

function startBossBattle(bossId) {
    const bossTemplate = gameBosses[bossId];

    if (!bossTemplate) {
        log("錯誤：找不到該 Boss 的資料！");
        return;
    }

    // 檢查最終魔王的挑戰條件
    if (bossId === 'finalBoss') {
        const hasAllFragments = bossTemplate.requiredFragments.every(
            fragmentId => player.magicFragments.includes(fragmentId)
        );
        if (!hasAllFragments) {
            log("你還沒有收集齊所有的魔法碎片，無法挑戰黑魔法師！");
            goToTown(); // 回到城鎮
            return;
        }
    }

    currentBattleArea = bossId;
    currentMonster = {
        ...bossTemplate,
        hp: bossTemplate.hp,
        isBoss: true
    };

    // **關鍵改動：禁用商店按鈕**
    const shopButton = document.getElementById("shopButton");
    if (shopButton) { // 檢查按鈕是否存在，避免報錯
        shopButton.disabled = true; // 禁用商店按鈕
        log("你已進入 Boss 戰，商店暫時無法使用。");
    }

    // 隱藏 `location` 區塊並顯示 `battle` 區塊
    document.getElementById("location").style.display = "none";
    document.getElementById("battle").style.display = "block";

    document.getElementById("monsterName").textContent = currentMonster.name;
    document.getElementById("monsterHp").textContent = currentMonster.hp;
    log(`⚔️ 你決定挑戰 ${currentMonster.name}！祝你好運！`);
    savePlayerData();
}

// `startBattle` 函式維持不變，它用於小怪
function startBattle(area) {
    currentBattleArea = area;
    const monsterTemplate = monstersByArea[area];
    currentMonster = {
        ...monsterTemplate,
        hp: monsterTemplate.hp
    };
    document.getElementById("battle").style.display = "block";
    document.getElementById("monsterName").textContent = currentMonster.name;
    document.getElementById("monsterHp").textContent = currentMonster.hp;
    log(`⚔️ 遇到 ${currentMonster.name} 了！`);
    savePlayerData();
}

let playerPoisoned = false; // 新增：玩家是否中毒
let poisonTurns = 0; // 新增：中毒持續回合數
const poisonDamagePerTurn = 5; // 新增：每回合中毒扣血量 (可調整)
let monsterStunned = false;

function attack() {
    const target = currentMonster;

    // --- 新增：處理玩家中毒效果 (在攻擊前扣血) ---
    if (playerPoisoned && poisonTurns > 0) {
        player.hp -= poisonDamagePerTurn;
        player.hp = Math.max(0, player.hp);
        log(`💀 你因中毒失去了 ${poisonDamagePerTurn} 點 HP！`);
        poisonTurns--; // 回合數減少
        updateStatus(); // 更新HP顯示
        if (player.hp <= 0) { // 如果中毒致死
            alert("你因毒發身亡！扣除20金幣就醫，你被送回弓箭手村。");
            log("你因中毒昏倒了，被送回弓箭手村！");
            player.hp = player.maxHp;
            player.exp = Math.max(0, player.exp - 10);
            const moneyPenalty = 20;
            player.gold = Math.max(0, player.gold - moneyPenalty);
            log(`昏倒了扣除 ${moneyPenalty} 金幣！`);
            updateStatus();
            goToTown();
            savePlayerData();
            return; // 結束本次攻擊
        }
    } else if (poisonTurns <= 0) {
        playerPoisoned = false; // 中毒回合結束，重置狀態
    }

    const totalDamage = Math.floor(Math.random() * 6) + 3 + getPlayerAttack();
    target.hp -= totalDamage;
    target.hp = Math.max(0, target.hp);
    document.getElementById("monsterHp").textContent = target.hp;

    log(`你使用 ${player.weapon ? player.weapon.name : '空手'} 對 ${target.name} 造成了 ${totalDamage} 點傷害！`);

    // 武器回血邏輯 (保持不變)
    if (player.weapon && player.weapon.healOnAttack) {
        const healedAmount = player.weapon.healOnAttack;
        player.hp = Math.min(player.maxHp, player.hp + healedAmount);
        log(`✨ 你的【${player.weapon.name}】讓你回復了 ${healedAmount} 點 HP！`);
        updateStatus();
    }

    // --- 新增的暈眩邏輯 ---
    // 每次攻擊時，重置暈眩狀態，避免無限暈眩
    monsterStunned = false; // 先假設沒有暈眩

    if (player.weapon && player.weapon.stunChance) {
        if (Math.random() < player.weapon.stunChance) {
            monsterStunned = true;
            log(`💥 你的【${player.weapon.name}】震暈了 ${target.name}！它一回合無法行動！`);
        }
    }
    // --- 暈眩邏輯結束 ---

    // --- 新增：玩家武器中毒敵人邏輯 (可選，如果需要怪物有中毒狀態) ---
     if (player.weapon && player.weapon.poisonChance && Math.random() < player.weapon.poisonChance) {
         target.poisoned = true; target.poisonTurns = X;
         log(`💀 你用【${player.weapon.name}】讓 ${target.name} 中毒了！`);
     }

    if (target.hp <= 0) {
        winBattle(target.name);
    } else {
        monsterAttack(); // 只有當怪物沒死時才呼叫怪物的攻擊
    }
    savePlayerData();
}



function monsterAttack() {
    // --- 新增的暈眩判斷 ---
    if (monsterStunned) {
        log(`${currentMonster.name} 被暈眩了，無法行動！`);
        monsterStunned = false; // 暈眩只持續一回合，所以結束後要重置
        savePlayerData();
        return; // 跳過怪物的攻擊邏輯
    }
    // --- 暈眩判斷結束 ---

    const damage = Math.floor(Math.random() * (currentMonster.attackMax - currentMonster.attackMin + 1)) + currentMonster.attackMin;
    log(`${currentMonster.name} 攻擊你！`);

    player.hp -= damage;
    player.hp = Math.max(0, player.hp);
    updateStatus();
    log(`造成了 ${damage} 點傷害！`);

    // --- 新增：Boss 中毒攻擊邏輯 ---
    if (currentMonster.id === 'perionBoss' && Math.random() < currentMonster.poisonAttackChance) {
        playerPoisoned = true;
        poisonTurns = 3; // 中毒持續3回合 (可調整)
        log(`☠️ 你中了【${currentMonster.name}】的劇毒！每回合將持續扣血。`);
    }

    if (player.hp <= 0) {
        alert("你昏倒了！扣除20金幣就醫，你被送回弓箭手村。");
        log("你昏倒了，被送回弓箭手村！");
        player.hp = player.maxHp;
        player.exp = Math.max(0, player.exp - 10);

        const moneyPenalty = 20;
        player.gold = Math.max(0, player.gold - moneyPenalty);
        log(`昏倒了扣除 ${moneyPenalty} 金幣！`);

        updateStatus();
        goToTown();
    }
    savePlayerData();
}




// main.js

function winBattle(monsterName) {
    log(`你打敗了 ${monsterName}！`);
    document.getElementById("battle").style.display = "none";
    player.exp += currentMonster.exp;
    log(`你獲得了 ${currentMonster.exp} 點經驗值！`);

    // 處理 Boss 獲勝邏輯 (這部分保持不變，因為是 Boss 特有的邏輯)
    if (currentMonster.isBoss) {
        log(`恭喜你！你擊敗了強大的 ${currentMonster.name}！`);
        player.bossStatus[currentMonster.id].defeated = true; // 設定該 Boss 為已擊敗

        if (currentMonster.fragmentId && !player.magicFragments.includes(currentMonster.fragmentId)) {
            player.magicFragments.push(currentMonster.fragmentId);
            player.bossStatus[currentMonster.id].fragmentObtained = true; // 標記碎片已獲得
            log(`💎 你獲得了【${currentMonster.name}】的魔法碎片！`);
        }

        const allFragmentsCollected = gameBosses.finalBoss.requiredFragments.every(
            fragmentId => player.magicFragments.includes(fragmentId)
        );
        if (allFragmentsCollected && !player.bossStatus.finalBoss.defeated) {
            log("你已經收集了所有魔法碎片！現在可以挑戰最終魔王了！");
        }

        if (currentMonster.id === 'finalBoss') {
        log("🎉🎉🎉 恭喜你，勇者！你擊敗了黑魔法師，拯救了世界！ 🎉🎉🎉");
        alert("你已擊敗黑魔法師，世界恢復了和平！感謝你的英勇！");

        // --- 顯示結局頁面並隱藏遊戲介面 ---
        document.getElementById("game-interface").style.display = "none"; // 假設你的主要遊戲介面都在這個 ID 下
        document.getElementById("endingScreen").style.display = "flex"; // 顯示結局畫面
        
        // --- 顯示結局頁面結束 ---

        return; // 擊敗最終Boss後直接返回，不再執行後續導航判斷
    }
    }

    // 武器掉落邏輯 (這裡會修改)
    const pool = currentMonster.weaponPool || weaponPool; // 如果怪物有自己的掉落池則用其，否則用通用掉落池
    const weaponRoll = Math.random();
    let weaponDropped = null;
    let cumulativeChance = 0;

    for (const weapon of pool) {
        cumulativeChance += weapon.chance;
        if (weaponRoll <= cumulativeChance) {
            weaponDropped = { ...weapon };
            break;
        }
    }

    if (weaponDropped) {
        log(`🎁 掉落物：${weaponDropped.rarity}武器【${weaponDropped.name}】（攻擊力 +${weaponDropped.power}）`);
        player.inventory.push(weaponDropped);
        log(`【${weaponDropped.name}】已加入背包！`);

        // --- 修改後的彈出視窗邏輯 ---
        // 無論是不是 Boss 掉落，只要有掉落武器就彈窗
        let message = `你獲得了${weaponDropped.rarity}武器【${weaponDropped.name}】！\n`;
        message += `攻擊力：+${weaponDropped.power}\n`;

        // 如果是 Boss 掉落的特殊武器，可以加上額外描述
        if (currentMonster.isBoss) {
            if (weaponDropped.healOnAttack) {
                message += `這把武器擁有特殊的【攻擊回血】能力，每次攻擊時能為你回復 ${weaponDropped.healOnAttack} 點生命值！\n`;
            } else if (weaponDropped.stunChance) {
                message += `這把武器擁有強大的【震擊】能力，每次攻擊有 ${weaponDropped.stunChance * 100}% 的機率震暈敵人一回合！\n`;
            } else if (weaponDropped.poisonChance) { // 如果是中毒武器
                alert(`恭喜你獲得了傳說級武器【${weaponDropped.name}】！
這把武器擁有【劇毒】能力，每次攻擊有 ${weaponDropped.poisonChance * 100}% 的機率使敵人中毒！`);
            }
            // 您可以在這裡繼續添加其他 Boss 武器特性的判斷
        }

        alert(message); // 彈出視窗
        // --- 彈出視窗邏輯結束 ---

    } else {
        log("沒有掉落任何武器。");
    }

    // 藥水掉落邏輯
    if (Math.random() < potionDropRate) {
        player.potions++;
        log(`💊 獲得了 1 瓶藥水！`);
    }

    // 升級邏輯
    if (player.exp >= player.expToLevel) {
        levelUp();
    }

    // **重新啟用商店按鈕 (Boss 戰勝利時)**
    const shopButton = document.getElementById("shopButton");
    if (shopButton) {
        shopButton.disabled = false; // 重新啟用商店按鈕
    }

    updateStatus();

    // 獲勝後導航
    if (currentMonster.isBoss) {
        // 根據 Boss ID 返回對應的村莊
        switch (currentMonster.id) {
            case 'forestBoss':
                goToTown(); // 菇菇寶貝王回弓箭手村
                break;
            case 'caveBoss':
                goToWarriorVillage(); // 黑岩洞窟 Boss 回勇士之村
                break;
            case 'warriorBoss':
                goToWarriorVillage(); // 石巨人回勇士之村
                break;
            case 'perionBoss':
                goToPerion(); // 毒氣骷髏王回墮落城市
                break;
            // finalBoss 已在上面特殊處理，所以這裡不需要再寫
            default:
                goToTown(); // 以防萬一，未知 Boss 默認回弓箭手村
                break;
        }
    } else {
        // 如果是小怪，回到之前的區域
        switch (currentBattleArea) {
            case 'forest':
                goToForest();
                break;
            case 'hill':
                goToHill();
                break;
            case 'cave':
                goToCave();
                break;
            case 'warriorPlain': // 新增勇士平原
                goToWarriorPlain(); 
                break;
            case 'boneMine': // --- 新增這裡 ---
                goToBoneMine();
                break;
            case 'runeTemple': // --- 新增這裡 ---
                goToRuneTemple();
                break;
            case 'subway': // --- 新增這裡 ---
                goToSubway();
                break;
            case 'shadowHound': // 從深淵裂縫的暗影獵犬戰鬥逃跑
                goToAbyssalRift(); // 返回深淵裂縫
                break;
            default:
                goToTown();
                break;
        }
    }
    savePlayerData();
}

function equipWeapon(index) {
    if (player.inventory[index]) {
        player.weapon = player.inventory[index];
        log(`你裝備了【${player.weapon.name}】！`);
        updateStatus();
        savePlayerData();
    }
}

function equipWeaponByName(name) {
    const weaponToEquip = player.inventory.find(weapon => weapon.name === name);
    if (weaponToEquip) {
        player.weapon = weaponToEquip; // ✅ 不要複製，要直接用背包那一把
        log(`你裝備了【${player.weapon.name}】！`);
        updateStatus();
        savePlayerData();
    }
}


function dropWeaponFromInventory(name) {
    const indexToRemove = player.inventory.findIndex(weapon => weapon.name === name);
    if (indexToRemove !== -1) {
        const droppedWeapon = player.inventory.splice(indexToRemove, 1)[0];
        log(`你丟棄了【${droppedWeapon.name}】。`);
        // 如果丟棄的是當前裝備的武器，則卸下
        if (player.weapon && player.weapon.name === droppedWeapon.name) { // 這裡也修改為比較名稱
            player.weapon = { name: "木棍", power: 0, rarity: "普通" };
            log("你卸下了裝備。");
        }
        updateStatus();
        savePlayerData();
        loadLeaderboard(); // 攻擊力可能改變，更新排行榜
    }
}

function usePotion() {
    if (player.potions > 0 && player.hp < player.maxHp) {
        player.hp = Math.min(player.maxHp, player.hp + potionHealAmount);
        player.potions--;
        log(`你使用了一瓶藥水，恢復了 ${potionHealAmount} 點 HP。`);
        updateStatus();
        savePlayerData();
    } else if (player.potions === 0) {
        log("你沒有藥水了。");
    } else if (player.hp === player.maxHp) {
        log("你的 HP 是滿的，不需要使用藥水。");
    }
}

function useLargePotion() {
    if (player.largePotions > 0 && player.hp < player.maxHp) {
        player.hp = Math.min(player.maxHp, player.hp + largePotionHealAmount);
        player.largePotions--;
        log(`你使用了一瓶大藥水，恢復了 ${largePotionHealAmount} 點 HP。`);
        updateStatus();
        savePlayerData();
    } else if (player.largePotions === 0) {
        log("你沒有藥水了。");
    } else if (player.hp === player.maxHp) {
        log("你的 HP 是滿的，不需要使用藥水。");
    }
}

function levelUp() {
    player.level += 1;
    player.exp = 0;
    player.expToLevel += 20;
    player.maxHp += 20;
    player.attackBase += 1; // 升級時增加基礎攻擊力

    // 🌟🌟🌟 新增這一行：升級時回復滿血 🌟🌟🌟
    player.hp = player.maxHp;

    log(`🎉 恭喜升級！你現在是 ${player.level} 級！基礎攻擊力增加！`);

    // --- 新增的彈出視窗邏輯 ---
    alert(`恭喜你升級了！
你現在是 ${player.level} 級！
生命值上限提升至 ${player.maxHp}！
基礎攻擊力提升至 ${player.attackBase}！
並且已回復所有生命值！`);
    // --- 彈出視窗邏輯結束 ---

    updateStatus(); // 確保升級後狀態立即更新
    savePlayerData();
}
function leaveBattle() {
    log("你逃離了戰鬥。");
    document.getElementById("battle").style.display = "none";
    document.getElementById("location").style.display = "block"; // 重新顯示地區導航

    // **關鍵改動：重新啟用商店按鈕**
    const shopButton = document.getElementById("shopButton");
    if (shopButton) {
        shopButton.disabled = false; // 重新啟用商店按鈕
    }

    // 逃跑後根據當前戰鬥區域判斷回到哪裡
    if (currentBattleArea === 'forestBoss' ||
        currentBattleArea === 'caveBoss' || currentBattleArea === 'warriorBoss' ||
        currentBattleArea === 'finalBoss') {
        goToTown(); // Boss 戰逃跑強制回到弓箭手村
    } else {
        switch (currentBattleArea) {
            case 'forest':
                goToForest();
                break;
            case 'hill':
                goToHill();
                break;
            case 'cave':
                goToCave();
                break;
            case 'warriorPlain':
                goToWarriorPlain();
                break;
            case 'boneMine': // --- 新增這裡 ---
                goToBoneMine();
                break;
            case 'runeTemple': // --- 新增這裡 ---
                goToRuneTemple();
                break;
             case 'subway': // --- 新增這裡 ---
                goToSubway();
                break;
            case 'shadowHound': // 從深淵裂縫的暗影獵犬戰鬥逃跑
                goToAbyssalRift(); // 返回深淵裂縫
                break;
            default:
                goToTown();
                break;
        }
    }
    savePlayerData();
}

function startGame() {
    document.getElementById("game-intro").style.display = "none";

    if (window.__isNewPlayer) {
        // 新玩家 → 顯示姓名輸入頁
        document.getElementById("nameInputScreen").style.display = "flex";
        document.getElementById("game-container").style.display = "none";
    } else {
        // 舊玩家 → 直接進入遊戲
        document.getElementById("nameInputScreen").style.display = "none";
        document.getElementById("game-container").style.display = "block";
        updateStatus();
        goToTown();
    }
}





// 提交姓名並開始遊戲
async function submitName() {
    const nameInput = document.getElementById("playerNameInput");
    const enteredName = nameInput.value.trim();

    if (enteredName.length < 2 || enteredName.length > 15) {
        alert("名字長度必須在 2 到 15 個字之間！");
        return;
    }

    player.name = enteredName;
    await savePlayerData();

    document.getElementById("nameInputScreen").style.display = "none";
    document.getElementById("game-container").style.display = "block";
    updateStatus();
    goToTown();
}


function restartGame() {
    location.reload(); // 重新載入頁面，重置遊戲狀態
}

// 視窗載入完成後，初始化 Firebase
// 視窗載入完成後，初始化 Firebase
// ✅ 在 onload 時全部先隱藏
window.onload = () => {
    document.getElementById("game-intro").style.display = "none";
    document.getElementById("nameInputScreen").style.display = "none";
    document.getElementById("game-container").style.display = "none";

    initFirebaseAndAuth();
};


