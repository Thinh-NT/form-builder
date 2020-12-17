
WebViewer({
    path: "lib/",
    initialDoc: "files/signed.pdf",
    showLocalFilePicker: true,
    fullAPI: true,
    disabledElements: [
        'selectToolButton',
        'searchButton',
        'panToolButton',
        'menuButton',
        'rubberStampToolGroupButton',
        'stampToolGroupButton',
        'fileAttachmentToolGroupButton',
        'calloutToolGroupButton',
        'annotationStyleEditButton', 'linkButton',
        'undoButton', 'redoButton'
    ],
}, document.getElementById('viewer'))
    .then(instance => {

        const { docViewer, Annotations, CoreControls, annotManager, iframeWindow } = instance;
        const { WidgetFlags } = Annotations;
        const fieldManager = annotManager.getFieldManager();

        instance.annotationPopup.add({
            type: 'actionButton',
            img: 'check.png',
            onClick: () => convert_to_field(),
        });

        convert_to_field = () => {
            const annotationsList = annotManager.getSelectedAnnotations();
            const annotsToDelete = [];
            const annotsToDraw = [];

            annotationsList.forEach((annot, index) => {
                let inputAnnot;
                let field;
                if (annot.getCustomData('type') !== '') {
                    // set readonly flag if necessary
                    const flags = new WidgetFlags();
                    if (annot.getCustomData('flag').readOnly) {
                        flags.set(WidgetFlags['READ_ONLY'], true);
                    }
                    if (annot.getCustomData('flag').multiline) {
                        flags.set(WidgetFlags['MULTILINE'], true);
                    }

                    // add it to clean up placeholder annots
                    annotsToDelete.push(annot);

                    // create a form field based on the type of annotation
                    if (annot.getCustomData('type') === 'TEXT') {
                        field = new Annotations.Forms.Field(annot.getContents() + Date.now() + index, {
                            type: 'Tx',
                            value: annot.getCustomData('value'),
                            flags,
                        });
                        inputAnnot = new Annotations.TextWidgetAnnotation(field);
                    } else if (annot.getCustomData('type') === 'SIGNATURE') {
                        field = new Annotations.Forms.Field(annot.getContents() + Date.now() + index, {
                            type: 'Sig',
                            flags,
                        });
                        inputAnnot = new Annotations.SignatureWidgetAnnotation(field, {
                            appearance: '_DEFAULT',
                            appearances: {
                                _DEFAULT: {
                                    Normal: {
                                        data:
                                            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjEuMWMqnEsAAAANSURBVBhXY/j//z8DAAj8Av6IXwbgAAAAAElFTkSuQmCC',
                                        offset: {
                                            x: 100,
                                            y: 100,
                                        },
                                    },
                                },
                            },
                        });
                    } else if (annot.getCustomData('type') === 'CHECK') {
                        flags.set(WidgetFlags.EDIT, true);
                        const font = new Annotations.Font({ name: 'Helvetica' });
                        field = new Annotations.Forms.Field(annot.getContents() + Date.now() + index, {
                            type: 'Btn',
                            value: 'Off',
                            flags,
                            font,
                        });
                        inputAnnot = new Annotations.CheckButtonWidgetAnnotation(field, {
                            appearance: 'Off',
                            appearances: {
                                Off: {},
                                Yes: {},
                            },
                        });
                    } else if (annot.getCustomData('type') === 'RADIO') {
                        flags.set(WidgetFlags.RADIO, true);
                        flags.set(WidgetFlags.NO_TOGGLE_TO_OFF, true);
                        const font = new Annotations.Font({ name: 'Helvetica' });
                        const name = annot.getCustomData('name');
                        const value = annot.getCustomData('value');
                        field = fieldManager.getField(name || 'RadioButtonGroup');
                        if (!field) {
                            field = new Annotations.Forms.Field(name || 'RadioButtonGroup', {
                                type: 'Btn',
                                value: 'Off',
                                flags,
                                font,
                            });
                        }
                        inputAnnot = new Annotations.RadioButtonWidgetAnnotation(field, {
                            appearance: 'Off',
                            appearances: {
                                Off: {},
                                [value || index]: {},
                            },
                        });
                    } else {
                        // exit early for other annotations
                        annotManager.deleteAnnotation(annot, { imported: false, force: true }); // prevent duplicates when importing xfdf
                        return;
                    }
                } else {
                    return;
                }

                // set flag and position
                inputAnnot.PageNumber = annot.getPageNumber();
                inputAnnot.X = annot.getX();
                inputAnnot.Y = annot.getY();
                inputAnnot.rotation = annot.Rotation;
                if (annot.Rotation === 0 || annot.Rotation === 180) {
                    inputAnnot.Width = annot.getWidth();
                    inputAnnot.Height = annot.getHeight();
                } else {
                    inputAnnot.Width = annot.getHeight();
                    inputAnnot.Height = annot.getWidth();
                }

                // customize styles of the form field
                Annotations.WidgetAnnotation.getCustomStyles = widget => {
                    if (widget instanceof Annotations.TextWidgetAnnotation) {
                        return {
                            'background-color': '#f7f9fc',
                            color: 'black',
                            'font-size': '20px',
                        };
                    }

                    if (widget instanceof Annotations.SignatureWidgetAnnotation) {
                        return {
                            border: '1px solid #f7f9fc',
                        };
                    }
                };
                Annotations.WidgetAnnotation.getCustomStyles(inputAnnot);

                annotManager.addAnnotation(inputAnnot);
                fieldManager.addField(field);
                annotsToDraw.push(inputAnnot);
            });

            annotManager.deleteAnnotations(annotsToDelete, { force: true });

            return annotManager.drawAnnotationsFromList(annotsToDraw).then(() => {
                dropPoint = {};
            });
        }

        annotManager.on('annotationSelected', (annotations, action) => {
            if (action === 'selected') {
                console.log('annotation selection');
            } else if (action === 'deselected') {
                console.log('annotation deselection');
            }
            if (annotations === null && action === 'deselected') {
                console.log('all annotations deselected');
            }
        });

        iframeWindow.convertAnnotToFormField = () => {

            const annotationsList = annotManager.getAnnotationsList();
            const annotsToDelete = [];
            const annotsToDraw = [];

            annotationsList.forEach((annot, index) => {
                let inputAnnot;
                let field;
                if (annot.getCustomData('type') !== '') {
                    // set readonly flag if necessary
                    const flags = new WidgetFlags();
                    if (annot.getCustomData('flag').readOnly) {
                        flags.set(WidgetFlags['READ_ONLY'], true);
                    }
                    if (annot.getCustomData('flag').multiline) {
                        flags.set(WidgetFlags['MULTILINE'], true);
                    }

                    // add it to clean up placeholder annots
                    annotsToDelete.push(annot);

                    // create a form field based on the type of annotation
                    if (annot.getCustomData('type') === 'TEXT') {
                        field = new Annotations.Forms.Field(annot.getContents() + Date.now() + index, {
                            type: 'Tx',
                            value: annot.getCustomData('value'),
                            flags,
                        });
                        inputAnnot = new Annotations.TextWidgetAnnotation(field);
                    } else if (annot.getCustomData('type') === 'SIGNATURE') {
                        field = new Annotations.Forms.Field(annot.getContents() + Date.now() + index, {
                            type: 'Sig',
                            flags,
                        });
                        inputAnnot = new Annotations.SignatureWidgetAnnotation(field, {
                            appearance: '_DEFAULT',
                            appearances: {
                                _DEFAULT: {
                                    Normal: {
                                        data:
                                            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjEuMWMqnEsAAAANSURBVBhXY/j//z8DAAj8Av6IXwbgAAAAAElFTkSuQmCC',
                                        offset: {
                                            x: 100,
                                            y: 100,
                                        },
                                    },
                                },
                            },
                        });
                    } else if (annot.getCustomData('type') === 'CHECK') {
                        flags.set(WidgetFlags.EDIT, true);
                        const font = new Annotations.Font({ name: 'Helvetica' });
                        field = new Annotations.Forms.Field(annot.getContents() + Date.now() + index, {
                            type: 'Btn',
                            value: 'Off',
                            flags,
                            font,
                        });
                        inputAnnot = new Annotations.CheckButtonWidgetAnnotation(field, {
                            appearance: 'Off',
                            appearances: {
                                Off: {},
                                Yes: {},
                            },
                        });
                    } else if (annot.getCustomData('type') === 'RADIO') {
                        flags.set(WidgetFlags.RADIO, true);
                        flags.set(WidgetFlags.NO_TOGGLE_TO_OFF, true);
                        const font = new Annotations.Font({ name: 'Helvetica' });
                        const name = annot.getCustomData('name');
                        const value = annot.getCustomData('value');
                        field = fieldManager.getField(name || 'RadioButtonGroup');
                        if (!field) {
                            field = new Annotations.Forms.Field(name || 'RadioButtonGroup', {
                                type: 'Btn',
                                value: 'Off',
                                flags,
                                font,
                            });
                        }
                        inputAnnot = new Annotations.RadioButtonWidgetAnnotation(field, {
                            appearance: 'Off',
                            appearances: {
                                Off: {},
                                [value || index]: {},
                            },
                        });
                    } else if (annot.getCustomData('type') === 'DATE') {
                        field = new Annotations.Forms.Field(annot.getContents() + Date.now() + index, {
                            type: 'Tx',
                            value: annot.getCustomData('value'),
                            flags,
                        });
                        inputAnnot = new Annotations.DatePickerWidgetAnnotation(field);
                    } else {
                        // exit early for other annotations
                        annotManager.deleteAnnotation(annot, { imported: false, force: true }); // prevent duplicates when importing xfdf
                        return;
                    }
                } else {
                    return;
                }

                // set flag and position
                inputAnnot.PageNumber = annot.getPageNumber();
                inputAnnot.X = annot.getX();
                inputAnnot.Y = annot.getY();
                inputAnnot.rotation = annot.Rotation;
                if (annot.Rotation === 0 || annot.Rotation === 180) {
                    inputAnnot.Width = annot.getWidth();
                    inputAnnot.Height = annot.getHeight();
                } else {
                    inputAnnot.Width = annot.getHeight();
                    inputAnnot.Height = annot.getWidth();
                }

                // customize styles of the form field
                Annotations.WidgetAnnotation.getCustomStyles = widget => {
                    if (widget instanceof Annotations.TextWidgetAnnotation) {
                        return {
                            'background-color': '#e6ebf5',
                            color: 'black',
                            'font-size': '20px',
                        };
                    }

                    if (widget instanceof Annotations.SignatureWidgetAnnotation) {
                        return {
                            border: '1px solid #e6ebf5',
                        };
                    }
                };
                Annotations.WidgetAnnotation.getCustomStyles(inputAnnot);

                annotManager.addAnnotation(inputAnnot);
                fieldManager.addField(field);
                annotsToDraw.push(inputAnnot);
            });

            annotManager.deleteAnnotations(annotsToDelete, { force: true });

            return annotManager.drawAnnotationsFromList(annotsToDraw).then(() => {
                dropPoint = {};
            });
        };

        // adding the annotation which later will be converted to form fields
        iframeWindow.addFormFieldAnnot = (type, name, value, flag) => {
            const zoom = docViewer.getZoom();
            const doc = docViewer.getDocument();
            const pageNumber = docViewer.getCurrentPage();
            const pageInfo = doc.getPageInfo(pageNumber);

            const textAnnot = new Annotations.FreeTextAnnotation();
            textAnnot.PageNumber = pageNumber;
            const rotation = docViewer.getCompleteRotation(pageNumber) * 90;
            textAnnot.Rotation = rotation;
            if (type === 'CHECK' || type === 'RADIO') {
                textAnnot.Width = 25 / zoom;
                textAnnot.Height = 25 / zoom;
            } else if (rotation === 270 || rotation === 90) {
                textAnnot.Width = 50 / zoom;
                textAnnot.Height = 250 / zoom;
            } else {
                textAnnot.Width = 250 / zoom;
                textAnnot.Height = 50 / zoom;
            }
            textAnnot.X = pageInfo.width / 2 - textAnnot.Width / 2;
            textAnnot.Y = pageInfo.height / 2 - textAnnot.Height / 2;

            textAnnot.setPadding(new CoreControls.Math.Rect(0, 0, 0, 0));
            textAnnot.setCustomData('name', name);
            textAnnot.setCustomData('type', type);
            textAnnot.setCustomData('value', value);
            textAnnot.setCustomData('flag', flag);

            // set the type of annot
            textAnnot.setContents(`${name}_${type}`);
            textAnnot.FontSize = `${25.0 / zoom}px`;
            textAnnot.FillColor = new Annotations.Color(211, 211, 211, 0.5);
            textAnnot.TextColor = new Annotations.Color(0, 165, 228);
            textAnnot.StrokeThickness = 1;
            textAnnot.StrokeColor = new Annotations.Color(0, 165, 228);
            textAnnot.TextAlign = 'center';
            textAnnot.Author = annotManager.getCurrentUser();

            annotManager.deselectAllAnnotations();
            annotManager.addAnnotation(textAnnot, true);
            annotManager.redrawAnnotation(textAnnot);
            annotManager.selectAnnotation(textAnnot);
            dropPoint = {};
            console.log('type: ', textAnnot.getCustomData('type'))
        };

        function create_date_picker() {

            const widgetFlags = new WidgetFlags();

            // set font type
            const font = new Annotations.Font({ name: 'Helvetica' });

            // create a form field
            const field = new Annotations.Forms.Field("some radio field group name", {
                flags: widgetFlags,
                font: font,
            });

            // create a widget annotation for the first button
            const widgetAnnot1 = new Annotations.DatePickerWidgetAnnotation(field, {

            });

            // create a widget annotation for the second button

            // set position and size
            widgetAnnot1.PageNumber = 0;
            widgetAnnot1.X = 100;
            widgetAnnot1.Y = 100;
            widgetAnnot1.Width = 50;
            widgetAnnot1.Height = 20;

            //add the form field and widget annotation
            annotManager.addAnnotation(widgetAnnot1);
            annotManager.drawAnnotationsFromList([widgetAnnot1]);
            annotManager.getFieldManager().addField(field);
        }



        document.getElementById('add-text').addEventListener('click', () => {
            iframeWindow.addFormFieldAnnot(type = 'TEXT', name = '', value = '', flag = {})
        })

        document.getElementById('add-signature').addEventListener('click', () => {
            iframeWindow.addFormFieldAnnot(type = 'SIGNATURE', name = '', value = '', flag = {})
        })

        document.getElementById('add-check-box').addEventListener('click', () => {
            iframeWindow.addFormFieldAnnot(type = 'CHECK', name = '', value = '', flag = {})
        })

        document.getElementById('add-radio-button').addEventListener('click', () => {
            iframeWindow.addFormFieldAnnot(type = 'RADIO', name = '', value = '', flag = {})
        })

        document.getElementById('add-datepicker').addEventListener('click', () => {
            iframeWindow.addFormFieldAnnot(type = 'DATE', name = '', value = '', flag = {})
            // create_date_picker()
        })

        document.getElementById('apply-all').addEventListener('click', () => {
            iframeWindow.convertAnnotToFormField()
        })


    });