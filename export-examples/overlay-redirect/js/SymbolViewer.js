const ICON_TAG = "Icon" // Use this string to find icon symbol
const ICON_TAG2 = "ic-" // Use this string to find icon symbol
const SUPPORT_TYPES = ["Text", "ShapePath", "Image", "ImageSymbol", "Symbol"]

class SymbolViewer extends AbstractViewer
{
    constructor()
    {
        super("symbol_viewer")
        //
        this.preventCustomTextSearch = true
        //
        this.createdPages = {}
        //this.symbolIDs = {} // layer indexes ( in pages[].layers ) of symbols
        this.currentLib = ""
        this.selected = null
        this.showSymbols = false
        this.insideExpViewer = false
        this.highlightWidgetName = null
    }

    initialize(force = false)
    {
        if (!super.initialize(force)) return

        // populate library select
        const libSelect = $('#symbol_viewer #lib_selector')
        libSelect.append($('<option>', {
            value: "",
            text: 'Library autoselection'
        }));
        for (const libName of Object.keys(SYMBOLS_DICT))
        {
            libSelect.append($('<option>', {
                value: libName,
                text: libName
            }));
        }
        libSelect.change(function ()
        {
            var libName = $(this).children("option:selected").val();
            viewer.symbolViewer._selectLib(libName)

        })
        //
        const symCheck = $('#symbol_viewer_symbols')
        symCheck.click(function ()
        {
            viewer.symbolViewer._setSymCheck($(this).is(':checked'))

        })
    }

    _setSymCheck(showSymbols)
    {
        this.showSymbols = showSymbols
        $('#lib_selector').toggle()
        this._reShowContent()

    }

    // called by Viewer
    pageChanged()
    {
        this._reShowContent()
    }

    _selectLib(libName)
    {
        this.currentLib = libName
        this._reShowContent()
    }

    _reShowContent()
    {
        delete this.createdPages[viewer.currentPage.index]

        // remove existing symbol links        
        this.page.linksDiv.children(".modalSymbolLink,.symbolLink").remove()
        for (const panel of this.page.fixedPanels)
        {
            panel.linksDiv.children(".modalSymbolLink,.symbolLink").remove()
        }

        // drop selection
        this.setSelected()

        // rebuild links
        this._buildElementLinks()

        // redraw inspector
        this._showEmptyContent()

    }


    toggle()
    {
        return this.visible ? this.hide() : this.show()
    }

    hide()
    {
        super.hide()
        if (this.insideExpViewer)
        {
            this.insideExpViewer = false
            viewer.expViewer.show()
        }
        this.highlightWidgetName = null
    }

    showFromExpViewer(highlightWidgetName = null)
    {
        this.insideExpViewer = true
        this.highlightWidgetName = highlightWidgetName
        this.show()
    }

    _hideSelf()
    {
        var isModal = viewer.currentPage && viewer.currentPage.type === "modal"
        if (isModal)
        {
            $(".modalSymbolLink").remove()
            delete this.createdPages[viewer.currentPage.index]
        }
        const contentDiv = isModal ? $('#content-modal') : $('#content')
        contentDiv.removeClass("contentSymbolsVisible")

        viewer.linksDisabled = false
        $('#symbol_viewer').addClass("hidden")

        this.setSelected(null, null, null)

        super._hideSelf()
    }

    onContentClick()
    {
        this.setSelected(null)
        return true
    }

    handleKeyDown(jevent)
    {

        const event = jevent.originalEvent

        if (77 == event.which)
        { // m
            // Key "M" eactivates Symbol Viewer
            this.toggle()
        } else
        {
            return super.handleKeyDown(jevent)
        }

        jevent.preventDefault()
        return true
    }

    handleKeyDownWhileInactive(jevent)
    {
        const event = jevent.originalEvent

        if (77 == event.which)
        { // m
            // Key "M" activates Symbol Viewer
            this.toggle()
        } else
        {
            return super.handleKeyDownWhileInactive(jevent)
        }

        jevent.preventDefault()
        return true
    }

    _showSelf()
    {
        if (!this.inited) this.initialize()

        viewer.toggleLinks(false)
        viewer.toogleLayout(false)
        viewer.linksDisabled = true

        this._buildElementLinks()

        var isModal = viewer.currentPage && viewer.currentPage.type === "modal"
        const contentDiv = isModal ? $('#content-modal') : $('#content')
        contentDiv.addClass("contentSymbolsVisible")

        this._showEmptyContent()

        $('#symbol_viewer').removeClass("hidden")

        super._showSelf()

    }

    _showEmptyContent()
    {
        $("#symbol_viewer_content").html("")
        $('#symbol_viewer #empty').html(story.experimentalExisting ?
            "Click any element to inspect.<br/>EXPERIMENTAL widgets are in <span style='color:orange'>orange</span>." :
            "Click any element to inspect"
        );
        $('#symbol_viewer #empty').removeClass("hidden")
    }


    _buildElementLinks()
    {
        this._buildElementLinksForPage(viewer.currentPage)
        for (let overlay of viewer.currentPage.currentOverlays)
        {
            this._buildElementLinksForPage(overlay)
        }
    }


    _buildElementLinksForPage(page)
    {
        var pageIndex = page.index
        this.pageIndex = pageIndex
        this.page = page
        if (!(pageIndex in this.createdPages))
        {
            const newPageInfo = {
                layerArray: [],
                siLayerIndexes: {}
            }
            // cache only standalone pages
            this.createdPages[pageIndex] = newPageInfo

            this.pageInfo = newPageInfo
        } else
        {
            this.pageInfo = this.createdPages[pageIndex]
        }
        //
        if (this.pageInfo.layerArray.length === 0)
        {
            const layers = layersData[this.pageIndex].c
            if (undefined != layers)
            {
                if (this.showSymbols)
                    this._processSymbolList(layers)
                else
                    this._processLayerList(layers)
            }
            this.pageInfo.layerArray.reverse()
            const len = this.pageInfo.layerArray.length - 1
            this.pageInfo.layerArray.forEach(l => l.infoIndex = Math.abs(l.infoIndex - len))
        }
        this.pageInfo.layerArray.forEach(l => viewer.symbolViewer._showElement(l))
        //
    }

    _processSymbolList(layers, isParentSymbol = false)
    {
        for (var l of layers.slice().reverse())
        {
            // l.b: library name
            if (
                l.s &&
                ("" == this.currentLib || (this.currentLib != "" && l.b && l.b == this.currentLib))
            )
            {
                this._addInfoElement(l)
            }/* else
                // l.s: symbol name
                // l.l: style name
                if (l.s != undefined || (!isParentSymbol && l.l != undefined)) {
                    this._showElement(l)
                }
            */
            // l.c : childs
            if (undefined != l.c)
                this._processSymbolList(l.c, l.s != undefined)
        }
    }

    _processLayerList(layers, sSI = null)
    {
        for (var l of layers.slice().reverse())
        {
            const isIcon = l.s && l.s.indexOf(ICON_TAG) > 0;
            if (isIcon || (SUPPORT_TYPES.indexOf(l.tp) >= 0))
            {
                this._addInfoElement(l, sSI)
            }
            // don't go deep inside an icon
            if (isIcon) continue
            // process childs
            if (undefined != l.c)
                this._processLayerList(l.c, "SI" == l.tp ? l : sSI)
        }
    }

    _addInfoElement(l, siLayer = null)
    {
        var currentPanel = this.page
        l.finalX = l.x
        l.finalY = l.y

        for (const panel of this.page.fixedPanels)
        {
            if (l.x >= panel.x && l.y >= panel.y &&
                ((l.x + l.w) <= (panel.x + panel.width)) && ((l.y + l.h) <= (panel.y + panel.height))
            )
            {
                l.finalX = l.x - panel.x
                l.finalY = l.y - panel.y
                currentPanel = panel
                break
            }
        }
        l.parentPanel = currentPanel

        // Check if layer is empty
        if ("Text" == l.tp)
        {
            if ("" == l.tx.trim()) return
        }

        // also push symbol instance to a list of layers (if was not aded before)        
        let indexOfSO = -1
        if (siLayer)
        {
            if (siLayer.s in this.pageInfo.siLayerIndexes)
            {
                indexOfSO = this.pageInfo.siLayerIndexes[siLayer.s]
            } else
            {
                indexOfSO = this.pageInfo.layerArray.length
                this.pageInfo.layerArray.push(siLayer)
            }
        }
        //
        l.indexOfSO = indexOfSO
        l.infoIndex = this.pageInfo.layerArray.length
        this.pageInfo.layerArray.push(l)

        // Check if some layer on top of current
        /*for (const pl of this.pageInfo.layerArray.filter(s => s.tp != "SI" && s.infoIndex != l.infoIndex))
        {
            if (pl.finalX <= l.finalX && pl.finalY <= l.finalY && (pl.finalX + pl.w) >= (l.finalX + l.w) && (pl.finalY + pl.h) >= (l.finalY + l.h))
            {
                if (l.indeIndex < pl.infoIndex) return

                const topIndex = pl.infoIndex
                const bottomIndex = l.infoIndex
                pl.infoIndex = bottomIndex
                l.infoIndex = topIndex
                this.pageInfo.layerArray[l.infoIndex] = l
                this.pageInfo.layerArray[pl.infoIndex] = pl
            }
        }*/
    }

    _showElement(l, siLayer = null)
    {

        var a = $("<a>", {
            class: viewer.currentPage.type === "modal" ? "modalSymbolLink" : "symbolLink",
            pi: this.pageIndex,
            li: l.infoIndex,
            si: l.indexOfSO
        })

        a.click(function (event)
        {
            const sv = viewer.symbolViewer
            const pageIndex = $(this).attr("pi")
            const layerIndex = $(this).attr("li")
            const siLayerIndex = $(this).attr("si")
            const pageInfo = sv.createdPages[pageIndex]
            let topLayer = pageInfo.layerArray[layerIndex]
            const siLayer = siLayerIndex >= 0 ? pageInfo.layerArray[siLayerIndex] : null

            sv.setSelected(event, topLayer, $(this))
            if (!sv.selected)
            {
                return false
            }
            const layer = sv.selected.layer // selection can be changed inside setSelected

            var symName = layer.s ? layer.s : (siLayer ? siLayer.s : null)
            //sv.showSymbols && layer.s ? layer.s : (siLayer ? siLayer.s : null)
            var styleName = layer.l

            const styleInfo = styleName != undefined ? viewer.symbolViewer._findStyleAndLibByStyleName(styleName) : undefined
            const symInfo = symName != undefined ? viewer.symbolViewer._findSymbolAndLibBySymbolName(symName) : undefined

            sv.docLinkAdded = false
            var info = ""
            // layer.b : shared library name, owner of style or symbol
            // layer.s : symbol name
            // layer.l : style name
            // layer.tp : layer type: SI, Text, ShapePath or Image
            // siLayer : symbol master, owner of the layer            

            // if layer has CSS classes described
            let decRes = undefined
            if (layer.pr != undefined)
            {
                let tokens = null
                if (styleInfo) tokens = styleInfo.style.tokens
                if (symInfo)
                {
                    const foundLayer = symInfo.symbol.layers[layer.n]
                    if (foundLayer)
                    {
                        if (null == tokens)
                            tokens = foundLayer.tokens
                        else
                            tokens = sv._mergeTokens(tokens, foundLayer.tokens)
                    }
                }
                decRes = sv._decorateCSS(layer, tokens, layer.b ? layer : siLayer)
            }

            info += sv._showLayerDimensions(layer)
            info += sv._showLayerSymbol(layer, symName, siLayer)
            info += sv._showLayerComment(layer, siLayer)
            info += sv._showLayerText(layer, siLayer, decRes)
            info += sv._showLayerFrame(layer, siLayer, decRes)

            // if layer has CSS classes described
            if (decRes) info += decRes.css

            // Process image layar
            if ("Image" == layer.tp)
            {
                info += sv._showLayerImage(layer)
            }

            $('#symbol_viewer #empty').addClass("hidden")
            $("#symbol_viewer_content").html(info)
            $("#symbol_viewer_content").removeClass("hidden")

            //alert(info)
            return false
        })

        a.prependTo(l.parentPanel.linksDiv)

        var style = "left: " + l.finalX + "px; top:" + l.finalY + "px; "
        style += "width: " + l.w + "px; height:" + l.h + "px; "
        const highlight = siLayer && siLayer.s && (
            (this.highlightWidgetName === null && siLayer.s.includes("EXPERIMENTAL")) ||
            (this.highlightWidgetName !== null && siLayer.s.includes(this.highlightWidgetName))
        )
        var symbolDiv = $("<div>", {
            class: "symbolDiv" + (highlight ? " exp" : ""),
        }).attr('style', style)
        symbolDiv.mouseenter(function ()
        {
            viewer.symbolViewer.mouseEnterLayerDiv($(this))
        })

        symbolDiv.appendTo(a)
    }

    _mergeTokens(list1, list2)
    {
        let adding = []
        list2.forEach(function (t2)
        {
            const res1 = list1.filter(t1 => t1[0] == t2[0])
            if (!res1.length) adding.push(t2)
        })
        if (adding.length)
            return list1.concat(adding)
        else
            return list1
    }



    _showLayerSymbol(layer, symName, siLayer)
    {
        if (undefined == symName) return ""
        // Drop path to icon, leave only name
        let categoryName = "Figma component"
        const iconTagPos = layer.n.indexOf(ICON_TAG)
        this.currLayerIsIcon = iconTagPos >= 0
        if (this.currLayerIsIcon)
        {
            const FIND_STR = "Name="
            if (symName.includes(FIND_STR))
            {
                symName = symName.split("=")[1]
                categoryName = "Icon"
            }
        }
        const libName = layer.b != undefined ? (layer.b + " (external)") :
            (siLayer && siLayer.b ? siLayer.b + " (external)" : "Document")
        //
        let info = `
        <hr>
        <div class="panel">
            <div class="label">${categoryName}</div>
            <div class="fieldset">
                <span class="label">Name</span>                
                <span class="value">${symName}</span>
            </div> 
            <div class="fieldset">
                <span class="label">Library</span>                
                <span class="value">${libName}</span>
            </div> 
        </div>
        `
        return info
    }

    _showExtDocRef(layer, symName, siLayer)
    {
        const emptyRes = ""
        if (this.docLinkAdded) return emptyRes
        if (undefined == layer.b && (undefined == siLayer || undefined == siLayer.b)) return emptyRes
        //
        let href = undefined
        let name = ""
        let parts = symName.split("/")

        const libName = layer.b ? layer.b : siLayer.b
        //  check if library has a dictionary file
        if (!(libName in SYMBOLS_DICT)) return emptyRes

        const attrs = SYMBOLS_DICT[libName].attrs
        // check if dictionary file has attrs defined
        if (undefined == attrs) return emptyRes

        while (parts.length)
        {
            name = parts.join("/")
            if (name in attrs)
            {
                href = attrs[name]["ext-doc-href"]
                if (undefined != href)
                {
                    break
                }
            }
            parts.pop()
        }
        if (!href) return emptyRes
        //        
        name = name.replace("_atoms/", "")
        if (href.toLowerCase().includes("experimental") && !name.toLowerCase().includes("experimental")) name += "-EXPERIMENTAL"
        this.docLinkAdded = true
        return `
                <hr>
                <div class="panel">
                    <div class="label">Documentation</div>
                    <div style="value"><a href="${href}" target="_blank">${name}</a></div>
                </div>`
    }

    _showLayerComment(layer, siLayer)
    {
        var comment = layer.comment
        if (comment === undefined && siLayer != undefined) comment = siLayer.comment
        if (comment === undefined) return ""

        return `
                <hr>
                <div class="panel">
                    <div class="label">Comment</div>
                    <div style="value">${comment}</div>
                </div>`
    }

    _showLayerImage(layer)
    {
        let info = ""
        const url = layer.iu
        info += `
                <hr>
                <div class='block'>
                <div class='label'>Image Content&nbsp;<a class="svlink" href="`+ url + `">Download</a>`
        let cssClass = "code value"
        const width = "100%" //viewer.defSidebarWidth - 40
        info += `</div ><div id='sv_content' class="` + cssClass + `"><img ` + `width="` + width + `" src="` + url + `"/></div>`
        return info
    }

    // siLayer: parent symbol 
    _showLayerText(layer, siLayer, cssInfo)
    {
        if (layer.tp !== "Text") return ""

        function fieldHtml(label, value)
        {
            if (label === undefined || value === undefined) return ""
            return `            
            <div class="fieldset">
                <span class="label">${label}</span>                
                <span class="value">${value}</span>
            </div>                                        
            `
        }

        let info = `
        <hr>
        <div class="panel">
            <div class="label">Text</div>
        `

        if (cssInfo)
        {
            info += fieldHtml("Font", cssInfo.styles["font-family"])
            info += fieldHtml("Weight", cssInfo.styles["font-weight"])
            info += fieldHtml("Size", cssInfo.styles["font-size"])
            info += fieldHtml("Letter", cssInfo.styles["letter-spacing"])
        }

        // Show text style
        if (layer.l !== undefined && layer.l !== "")
        {
            let styleName = layer.l
            const libName = layer.b != undefined ? (layer.b + " (external)") :
                (siLayer ? siLayer.b + " (external)" : "Document")

            info += fieldHtml("Figma style", styleName)
            //<div style='font-size:12px; color:var(--color-secondary)'>${libName}</div>
        }

        // Show text content
        if (layer.tx !== "")
        {
            info += `
                <div class= "fieldset">        
                <span class="label">Content</span>
                <span class="value"><button style="width:60px;" onclick = "copyToBuffer('sv_content')">Copy</button></span>
            </div>
                <div class="fieldset">
                    <span class="text" id="sv_content">
                        ${layer.tx}
                    </spane>
                </div>
            `
        }

        info += `
        </div >
                `
        return info
        //return this._showExtDocRef(layer, styleName, siLayer) + info
    }



    // siLayer: parent symbol 
    _showLayerFrame(layer, siLayer, cssInfo)
    {
        if (cssInfo === undefined || cssInfo === "") return ""
        let info = ""

        function colorHtml(value)
        {
            if (value === undefined) return ""
            if (Array.isArray(value))
            {
                let res = ""
                value.forEach(s => res += colorHtml(s))
                return res
            }
            return `            
            <div class="colorset">
                <span class="color" style="background-color:${value}">&nbsp;</span>                
                <span class="value">${value}</span>
            </div>                                        
            `
        }

        if (cssInfo.styles["background-color"] !== undefined)
        {
            info += `
            <hr>
            <div class="panel">
                <div class="label">${layer.tp !== "Text" ? "Backgrounds" : "Colors"}</div>
                ${colorHtml(cssInfo.styles["background-color"])}        
            </div>
        `}
        if (cssInfo.styles["border-color"] !== undefined)
        {
            info += `
            <hr>
            <div class="panel">
                <div class="label">Borders</div>
                ${colorHtml(cssInfo.styles["border-color"])}        
            </div>
        `}
        return info
    }

    _showLayerDimensions(layer)
    {
        let info = ""

        var frameX = layer.finalX
        var frameY = layer.finalY
        var frameWidth = layer.w
        var frameHeight = layer.h
        const PADDING = 20;

        info += `
                <hr/>
            <div class="panel" style="position:relative;height:64px">
                <div class="label">Frame</div>
                <div class="field" style="position:absolute;top:30px;left:0px;">
                    <span class="label">X</span><span class="value">${Math.round(frameX)}</span>
                </div>
                <div class="field" style="position:absolute;top:30px;left:120px;">
                    <span class="label">Y</span><span class="value">${Math.round(frameY)}</span>
                </div>
                <div class="field" style="position:absolute;top:54px;left:0px;">
                    <span class="label">W</span><span class="value">${Math.round(frameWidth)}</span>
                </div>
                <div class="field" style="position:absolute;top:54px;left:120px;">
                    <span class="label">H</span><span class="value">${Math.round(frameHeight)}</span>
                </div>
            </div>
        `
        return info
    }

    setSelected(event = null, layer = null, a = null, force = false)
    {
        const prevClickedLayer = this.lastClickedLayer
        this.lastClickedLayer = layer
        //
        const click = event ? {
            x: event.offsetX * viewer.currentZoom + layer.finalX,
            y: event.offsetY * viewer.currentZoom + layer.finalY
        } : {}
        let foundLayers = []
        this.findOtherSelection(click, null, foundLayers)
        // reset previous selection                
        if (this.selected)
        {
            if (!force && event && layer)
            {
                if (foundLayers.length > 1)
                {
                    let newIndex = undefined
                    if (undefined != prevClickedLayer && layer.ii != prevClickedLayer.ii)
                    {
                        // clicked on an other layer, find its index
                        newIndex = foundLayers.indexOf(layer)
                    } else if (undefined != this.selectedLayerIndex)
                    {
                        // clicked on the some layer, but 
                        // we have several overlaped objects under a cursor, so switch to the next 
                        newIndex = (this.selectedLayerIndex + 1) >= foundLayers.length ? 0 : this.selectedLayerIndex + 1
                    } else
                    {
                        newIndex = foundLayers.indexOf(layer)
                    }
                    layer = foundLayers[newIndex]
                    this.selectedLayerIndex = newIndex
                }
            }
            this.selected.marginDivs.forEach(d => d.remove())
            this.selected.borderDivs.forEach(d => d.remove())
        } else
        {
            this.selectedLayerIndex = foundLayers.indexOf(layer)
        }

        if (!layer)
        {
            this.selected = null
            this.lastClickedLayer = undefined
            this.selectedLayerIndex = undefined
            ////
            $('#symbol_viewer #empty').removeClass("hidden")
            $("#symbol_viewer_content").addClass("hidden")
            ////
            return
        }
        // select new
        this.selected = {
            layer: layer,
            a: $(this),
            marginDivs: [],
            borderDivs: [],
        }
        // draw left vertical border
        this.selected.borderDivs.push(
            this._drawMarginLine(layer.parentPanel, layer.finalX, 0, 1, layer.parentPanel.height, "svBorderLineDiv")
        )
        // draw right vertical border
        this.selected.borderDivs.push(
            this._drawMarginLine(layer.parentPanel, layer.finalX + layer.w, 0, 1, layer.parentPanel.height, "svBorderLineDiv")
        )
        // draw top horizonal border
        this.selected.borderDivs.push(
            this._drawMarginLine(layer.parentPanel, 0, layer.finalY, layer.parentPanel.width, 1, "svBorderLineDiv")
        )
        // draw bottom horizonal border
        this.selected.borderDivs.push(
            this._drawMarginLine(layer.parentPanel, 0, layer.finalY + layer.h, layer.parentPanel.width, 1, "svBorderLineDiv")
        )
    }

    findOtherSelection(click, layers, foundLayers)
    {
        if (null == layers) layers = layersData[this.pageIndex].c

        if (undefined == layers) return
        for (var l of layers.slice().reverse())
        {
            if ((!this.showSymbols || l.s != undefined) &&
                SUPPORT_TYPES.indexOf(l.tp) >= 0)
            {
                if (click.x >= l.finalX && click.x <= (l.finalX + l.w) && click.y >= l.finalY && click.y <= (l.finalY + l.h))
                {
                    foundLayers.push(l)
                }
            }
            if (undefined != l.c)
                this.findOtherSelection(click, l.c, foundLayers)
        }
    }


    mouseEnterLayerDiv(div)
    {
        // get a layer under mouse 
        const a = div.parent()
        const sv = viewer.symbolViewer
        const pageIndex = a.attr("pi")
        const layerIndex = a.attr("li")
        const layer = sv.createdPages[pageIndex].layerArray[layerIndex]
        if (!layer) return
        // get a currently selected layer
        if (!sv.selected) return
        const slayer = sv.selected.layer
        //
        if (!slayer || !layer) return
        // check if layers are in the same panel
        if (slayer.parentPanel != layer.parentPanel) return
        // remove previous margins
        this.selected.marginDivs.forEach(d => d.remove())
        this.selected.marginDivs = []
        // show margins
        this._drawTopVMargin(slayer.parentPanel, layer, slayer)
        this._drawBottomVMargin(slayer.parentPanel, layer, slayer)
        this._drawLeftHMargin(slayer.parentPanel, layer, slayer)
        this._drawRightHMargin(slayer.parentPanel, layer, slayer)
    }

    _drawLeftHMargin(currentPanel, layer, slayer)
    {
        let hmargin = 0
        let x = null
        if (layer.finalX == slayer.finalX)
        {
        } else if ((slayer.finalX + slayer.w) < layer.finalX)
        {
            // if layer bottom over slayer top => don't show top margin
        } else if ((layer.finalX + layer.w) < slayer.finalX)
        {
            // layer bottom over slayer.top
            x = layer.finalX + layer.w
            hmargin = slayer.finalX - x
        } else if (layer.finalX < slayer.finalX)
        {
            // layer top over slayer.top
            x = layer.finalX
            hmargin = slayer.finalX - x
        } else
        {
            // layer top over slayer.top
            x = slayer.finalX
            hmargin = layer.finalX - x
        }

        if (hmargin > 0)
        {
            let y = this._findLayersCenterY(layer, slayer)
            this.selected.marginDivs.push(this._drawMarginLine(currentPanel, x, y, hmargin, 1, "svMarginLineDiv"))
            this.selected.marginDivs.push(this._drawMarginValue(currentPanel, x + hmargin / 2, y, hmargin, "svMarginLineDiv"))
        }
    }


    _drawRightHMargin(currentPanel, layer, slayer)
    {
        let hmargin = 0
        let x = null

        const layerRight = layer.finalX + layer.w
        const slayerRight = slayer.finalX + slayer.w

        if (layerRight == slayerRight)
        {
        } else if (layerRight < slayer.finalX)
        {
            // if layer bottom over slayer bottom => don't show bottom margin                
        } else if (slayerRight < layer.finalX)
        {
            // slayer bottom over layer.top
            x = slayerRight
            hmargin = layer.finalX - x
        } else if (slayerRight < layerRight)
        {
            // slayer bottom over layer.bottom
            x = slayerRight
            hmargin = layerRight - x
        } else
        {
            // slayer bottom over layer.bottom
            x = layerRight
            hmargin = slayerRight - x
        }

        if (hmargin > 0)
        {
            let y = this._findLayersCenterY(layer, slayer)
            this.selected.marginDivs.push(this._drawMarginLine(currentPanel, x, y, hmargin, 1, "svMarginLineDiv"))
            this.selected.marginDivs.push(this._drawMarginValue(currentPanel, x + hmargin / 2, y, hmargin, "svMarginLineDiv"))
        }
    }


    _drawTopVMargin(currentPanel, layer, slayer)
    {
        let vmargin = 0
        let y = null
        if (layer.finalY == slayer.finalY)
        {
        } else if ((slayer.finalY + slayer.h) < layer.finalY)
        {
            // if layer bottom over slayer top => don't show top margin
        } else if ((layer.finalY + layer.h) < slayer.finalY)
        {
            // layer bottom over slayer.top
            y = layer.finalY + layer.h
            vmargin = slayer.finalY - y
        } else if (layer.finalY < slayer.finalY)
        {
            // layer top over slayer.top
            y = layer.finalY
            vmargin = slayer.finalY - y
        } else
        {
            // layer top over slayer.top
            y = slayer.finalY
            vmargin = layer.finalY - y
        }

        if (vmargin > 0)
        {
            let x = this._findLayersCenterX(layer, slayer)
            this.selected.marginDivs.push(this._drawMarginLine(currentPanel, x, y, 1, vmargin, "svMarginLineDiv"))
            this.selected.marginDivs.push(this._drawMarginValue(currentPanel, x, y + vmargin / 2, vmargin, "svMarginLineDiv"))
        }
    }

    _drawBottomVMargin(currentPanel, layer, slayer)
    {
        let vmargin = 0
        let y = null

        const layerBottom = layer.finalY + layer.h
        const slayerBottom = slayer.finalY + slayer.h

        if (layerBottom == slayerBottom)
        {
        } else if (layerBottom < slayer.finalY)
        {
            // if layer bottom over slayer bottom => don't show bottom margin        
        } else if (slayerBottom < layer.finalY)
        {
            // slayer bottom over layer.top
            y = slayerBottom
            vmargin = layer.finalY - y
        } else if (slayerBottom < layerBottom)
        {
            // slayer bottom over layer.bottom
            y = slayerBottom
            vmargin = layerBottom - y
        } else
        {
            // slayer bottom over layer.bottom
            y = layerBottom
            vmargin = slayerBottom - y
        }

        if (vmargin > 0)
        {
            let x = this._findLayersCenterX(layer, slayer)
            this.selected.marginDivs.push(this._drawMarginLine(currentPanel, x, y, 1, vmargin, "svMarginLineDiv"))
            this.selected.marginDivs.push(this._drawMarginValue(currentPanel, x, y + vmargin / 2, vmargin, "svMarginLineDiv"))
        }
    }


    _findLayersCenterX(l, sl)
    {
        let c = l.finalX + l.w / 2
        let sc = sl.finalX + sl.w / 2
        return sl.finalX > l.finalX && ((sl.finalX + sl.w) < (l.finalX + l.w)) ? sc : c
    }

    _findLayersCenterY(l, sl)
    {
        let c = l.finalY + l.h / 2
        let sc = sl.finalY + sl.h / 2
        return sl.finalY > l.finalY && ((sl.finalY + sl.h) < (l.finalY + l.h)) ? sc : c
    }

    _drawMarginLine(currentPanel, x, y, width, height, className)
    {
        var style = "left: " + x + "px; top:" + y + "px; "
        style += "width: " + width + "px; height:" + height + "px; "
        var div = $("<div>", { class: className }).attr('style', style)
        div.appendTo(currentPanel.linksDiv)
        return div
    }
    _drawMarginValue(currentPanel, x, y, value)
    {
        const valueHeight = 20
        const valueWidth = 30
        var style = "left: " + (x - valueWidth / 2) + "px; top:" + (y - valueHeight / 2) + "px; "
        //style += "width: " + valueWidth + "px; height:" + valueHeight + "px; "
        var div = $("<div>", {
            class: "svMarginValueDiv",
        }).attr('style', style)
        //
        div.html(" " + Number.parseFloat(value).toFixed(0) + " ")
        //
        div.appendTo(currentPanel.linksDiv)
        return div
    }

    _decorateCSS(layer, tokens, siLayer)
    {
        let css = layer.pr
        let result = ""
        let styles = {}

        result += `
                <hr/>
                <div class="panel">
                    <div class="label">CSS Styles</div>
                    <div class="value code">
                        `

        // Decorate styles already described in CSS 
        css.split("\n").forEach(line =>
        {
            if ("" == line) return
            const props = line.split(": ", 2)
            if (!props.length) return
            const styleName = props[0]
            const styleValue = props[1].slice(0, -1)

            result += this._decorateCSSOneStyle(tokens, layer, siLayer, styleName, styleValue)
            if (styles[styleName] === undefined)
            {
                styles[styleName] = styleValue
            } else if (Array.isArray(styles[styleName]))
            {
                styles[styleName].push(styleValue)
            } else
            {
                // Convert exsting single into new array
                styles[styleName] = [styles[styleName], styleValue]
            }

        }, this);
        // Add missed CSS styles based on tokens
        result += this._decorateCSSLostTokens(tokens, styles, layer, siLayer)
        // Decorate non-CSS common styles
        result += this._decorateCSSOtherTokens(tokens, layer, siLayer)


        result += `</div></div>`
        return { "css": result, "styles": styles }
    }


    _decorateCSSOneStyle(tokens, layer, siLayer, styleName, styleValue)
    {
        let result = ""
        // Decorate style name
        let styleNameTxt = styleName
        if (this.currLayerIsIcon && styleName === "background-color") styleNameTxt = "color"
        result += "" + styleNameTxt + ": "
        result += "<span class='tokenName'>"
        //
        let cvTokens = null
        if (layer.cv && "color" == styleName)
        {
            // get token for color variable
            cvTokens = this._findSwatchTokens(layer.cv)
            if (cvTokens)
            {
                const tokenStr = this._decorateSwatchToken(cvTokens, styleValue)
                result += tokenStr != "" ? tokenStr : (styleValue + ";")
            }
        }
        if (null == cvTokens)
        {
            const tokenStr = tokens != null ? this._decorateStyleToken(styleName, tokens, siLayer, styleValue) : ""
            if (tokenStr === undefined) return ""
            result += tokenStr != "" ? tokenStr : (styleValue + ";")
        }
        //
        result += "</span>"
        result += "<br/>"
        return result
    }

    _decorateCSSLostTokens(tokens, styles, layer, siLayer)
    {
        if (null == tokens) return ""
        let result = ""
        const knownOtherStyles = ["width2", "height2"]
        const reversed = tokens.slice().reverse()
        const processed = {}
        tokens.filter(token => !(token[0] in styles) && knownOtherStyles.indexOf(token[0]) < 0).forEach(token =>
        {
            if (token[0] != "background-color" && (token[0] in processed)) return
            processed[token[0]] = true
            result += this._decorateCSSOneStyle(tokens, layer, siLayer, token[0], token[1])
        }, this)
        return result
    }

    _decorateCSSOtherTokens(tokens, layer, siLayer)
    {
        if (null == tokens) return ""
        let result = ""
        const knownOtherStyles = ["width2", "height2"]
        tokens.filter(t => knownOtherStyles.indexOf(t[0]) >= 0 || t[0].startsWith("margin") || t[0].startsWith("padding")).forEach(function (token)
        {
            result += this._decorateCSSOneStyle(tokens, layer, siLayer, token[0], token[1])
        }, this)
        return result
    }

    _decorateSwatchToken(tokens, styleValue)
    {
        const tokenName = tokens[0][1]
        //
        return tokenName + ";</span><span class='tokenValue'>//" + styleValue
    }

    _decorateStyleToken(style, tokens, siLayer, styleValue)
    {
        // search tokan name by style name 
        const foundTokens = tokens.filter(t => t[0] == style)
        if (!foundTokens.length) return ""
        const tokenName = foundTokens[foundTokens.length - 1][1]
        //
        const libName = siLayer && undefined != siLayer.b ? siLayer.b : story.docName
        const finalTokenInfo = this._findTokenValueByName(tokenName, libName, styleValue)
        //
        if (finalTokenInfo)
            return finalTokenInfo[0] + ";</span><span class='tokenValue'>//" + finalTokenInfo[1]
        else if (foundTokens[0].length == 3)
            return tokenName + ";</span><span class='tokenValue'>//" + foundTokens[0][2]
        else if (foundTokens[0].length == 2)
        {
            if (foundTokens[0][1].includes("@"))
                return undefined
            else
                return tokenName + ";</span><span class='tokenValue'>//" + foundTokens[0][1]
        } else
            return ""

    }


    _showTextPropery(propName, propValue, postfix = "")
    {
        let text = propName + ": " + propValue + postfix + ";"
        return text + "<br/>"
    }

    // result: undefined or [tokenName,tokenValue]
    _findTokenValueByName(tokenName, libName, styleValue = null)
    {
        const lib = TOKENS_DICT[libName]
        if (undefined == lib) return undefined
        let value = lib[tokenName]
        if (value != undefined || null == styleValue) return [tokenName, lib[tokenName]]

        ///// try to find a token with a similar name
        // cut magic postfix to get a string for search
        const pos = tokenName.indexOf("--token")
        if (pos < 0) return undefined
        styleValue = styleValue.toLowerCase()
        const newName = tokenName.slice(0, pos)
        // filter lib tokens by name and value
        const similarTokens = Object.keys(lib).filter(function (n)
        {
            return n.startsWith(newName) && lib[n].toLowerCase() == styleValue
        }, this)
        if (!similarTokens.length) return undefined
        //
        return [
            similarTokens[0],
            lib[similarTokens[0]]
        ]
    }

    _findSymbolAndLibBySymbolName(symName)
    {
        for (const libName of Object.keys(SYMBOLS_DICT))
        {
            const lib = SYMBOLS_DICT[libName]
            if (!(symName in lib)) continue
            return {
                lib: lib,
                libName: libName,
                symbol: lib[symName]
            }
        }
        return undefined
    }

    _findStyleAndLibByStyleName(styleName)
    {
        for (const libName of Object.keys(SYMBOLS_DICT))
        {
            const lib = SYMBOLS_DICT[libName]
            if (!("styles" in lib) || !(styleName in lib.styles)) continue
            return {
                lib: lib,
                libName: libName,
                style: lib.styles[styleName]
            }
        }
        return undefined
    }

    // cv:{
    //   sn: swatch name
    //   ln:  lib name
    // }
    _findSwatchTokens(cv)
    {
        const lib = SYMBOLS_DICT[cv.ln]
        if (!lib)
        {
            console.log("Can not find lib " + cv.ln)
            return null
        }
        //
        const swatch = lib.colors__[cv.sn]
        if (!swatch)
        {
            console.log("Can not find color name " + cv.sn)
            return null
        }

        return swatch
    }
}
