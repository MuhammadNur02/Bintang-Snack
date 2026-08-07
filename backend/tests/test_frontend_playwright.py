import asyncio
from playwright.async_api import async_playwright

async def run_test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Enable console logs
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        
        try:
            # Set mobile viewport
            await page.set_viewport_size({"width": 375, "height": 667})
            
            print("Navigating to http://localhost:3000...")
            await page.goto("http://localhost:3000", timeout=30000)
            
            # Wait for main container
            await page.wait_for_selector('[data-testid="main-container"]', timeout=15000)
            print("App loaded successfully!")
            
            # Check initial state and tabs
            assert await page.is_visible('[data-testid="ledger-view"]')
            print("Ledger view visible")
            
            # Test opening Add Modal
            print("Opening Add Penitip Modal...")
            await page.click('[data-testid="add-item-header-btn"]', force=True)
            await page.wait_for_selector('[data-testid="item-form-modal"]', timeout=5000)
            print("Modal opened successfully")
            
            # Fill Penitip details
            await page.fill('[data-testid="input-penitip"]', "TEST Bu Ani")
            await page.fill('[data-testid="input-whatsapp"]', "081122334455")
            
            # Fill first product (Product #1)
            await page.fill('[data-testid="input-item-name-0"]', "TEST Nasi Kuning")
            await page.fill('[data-testid="input-harga-pokok-0"]', "5000")
            await page.fill('[data-testid="input-harga-jual-0"]', "8000")
            await page.fill('[data-testid="input-titip-0"]', "10")
            await page.fill('[data-testid="input-sisa-0"]', "2")
            
            # Test adding second product row dynamically (Multi-item feature)
            print("Adding second product row dynamically...")
            await page.click('[data-testid="add-product-row-btn"]', force=True)
            await page.wait_for_selector('[data-testid="form-product-card-1"]', timeout=3000)
            
            # Fill second product (Product #2)
            await page.fill('[data-testid="input-item-name-1"]', "TEST Sate Ayam")
            await page.fill('[data-testid="input-harga-pokok-1"]', "15000")
            await page.fill('[data-testid="input-harga-jual-1"]', "20000")
            await page.fill('[data-testid="input-titip-1"]', "5")
            await page.fill('[data-testid="input-sisa-1"]', "1")
            
            print("Submitting new consignment with multi-items...")
            await page.click('[data-testid="submit-item-btn"]', force=True)
            await page.wait_for_timeout(1000)
            
            # Verify new item appears in list
            await page.wait_for_selector('text=TEST Bu Ani', timeout=5000)
            print("Multi-item consignment added and verified in ledger!")
            
            # Test switching to Rekap Setoran Tab
            print("Switching to Rekap Setoran tab...")
            await page.click('[data-testid="tab-summary"]', force=True)
            await page.wait_for_selector('[data-testid="recap-view"]', timeout=5000)
            print("Rekap Setoran view visible")
            
            # Take verification screenshot
            await page.screenshot(path="/tmp/recap_screenshot.png", quality=40, full_page=False)
            print("Screenshot saved to /tmp/recap_screenshot.png")
            
            print("All frontend tests passed successfully!")
            
        except Exception as e:
            print(f"Error during test execution: {str(e)}")
            await page.screenshot(path="/tmp/error_screenshot.png", quality=40, full_page=False)
            raise e
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run_test())
