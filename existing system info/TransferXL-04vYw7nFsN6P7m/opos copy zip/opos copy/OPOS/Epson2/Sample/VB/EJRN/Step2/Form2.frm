VERSION 5.00
Object = "{CCB90150-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSPOSPrinter.ocx"
Object = "{CCB90270-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSElectronicJournal.ocx"
Begin VB.Form Form2 
   Caption         =   "Step 2 Printing the data saved in storage medium."
   ClientHeight    =   7785
   ClientLeft      =   60
   ClientTop       =   345
   ClientWidth     =   6270
   LinkTopic       =   "Form2"
   ScaleHeight     =   7785
   ScaleWidth      =   6270
   StartUpPosition =   3  'Windows Default
   Begin VB.Frame FrameElectronicJournal 
      Caption         =   "Electronic Journal"
      Height          =   4575
      Left            =   360
      TabIndex        =   3
      Top             =   2040
      Width           =   5655
      Begin VB.CommandButton EraseMediumButton 
         Caption         =   "EraseMedium"
         Height          =   375
         Left            =   240
         TabIndex        =   14
         Top             =   4080
         Width           =   2295
      End
      Begin VB.Frame Frame2 
         Height          =   2055
         Left            =   120
         TabIndex        =   8
         Top             =   1800
         Width           =   5295
         Begin VB.TextBox EndMarkerEdit 
            Height          =   375
            Left            =   2640
            TabIndex        =   11
            Text            =   "MarkerByStep2"
            Top             =   1440
            Width           =   2415
         End
         Begin VB.TextBox StartMarkerEdit 
            Height          =   375
            Left            =   2640
            TabIndex        =   10
            Text            =   "MarkerByStep1"
            Top             =   600
            Width           =   2415
         End
         Begin VB.CommandButton PrintContentButton 
            Caption         =   "Print Storage Content"
            Height          =   375
            Left            =   120
            TabIndex        =   9
            Top             =   840
            Width           =   2295
         End
         Begin VB.Label Label2 
            Caption         =   "End Marker"
            Height          =   255
            Left            =   2520
            TabIndex        =   13
            Top             =   1200
            Width           =   1335
         End
         Begin VB.Label Label1 
            Caption         =   "Start Marker"
            Height          =   255
            Left            =   2520
            TabIndex        =   12
            Top             =   360
            Width           =   1455
         End
      End
      Begin VB.TextBox MarkerEdit 
         Height          =   375
         Left            =   2760
         TabIndex        =   6
         Text            =   "MarkerByStep2"
         Top             =   1080
         Width           =   2415
      End
      Begin VB.CommandButton AddMarkerButton 
         Caption         =   "AddMarker"
         Height          =   375
         Left            =   240
         TabIndex        =   5
         Top             =   1080
         Width           =   2295
      End
      Begin VB.Frame Frame1 
         Height          =   855
         Left            =   120
         TabIndex        =   7
         Top             =   840
         Width           =   5295
      End
      Begin VB.CheckBox StorageEnabledCheck 
         Caption         =   "StorageEnabled"
         Height          =   255
         Left            =   1680
         TabIndex        =   4
         Top             =   360
         Width           =   2175
      End
   End
   Begin VB.CommandButton PrintButton 
      Caption         =   "Print Receipt"
      Height          =   375
      Left            =   1560
      TabIndex        =   0
      Top             =   960
      Width           =   3135
   End
   Begin VB.Frame Frame11 
      Caption         =   "Receipt Printer"
      Height          =   1455
      Left            =   360
      TabIndex        =   2
      Top             =   360
      Width           =   5655
   End
   Begin VB.CommandButton ExitButton 
      Caption         =   "Close"
      Height          =   375
      Left            =   4560
      TabIndex        =   1
      Top             =   6840
      Width           =   1455
   End
   Begin OposElectronicJournal_CCOCtl.OPOSElectronicJournal OPOSElectronicJournal1 
      Left            =   1200
      OleObjectBlob   =   "Form2.frx":0000
      Top             =   6960
   End
   Begin OposPOSPrinter_CCOCtl.OPOSPOSPrinter OPOSPOSPrinter1 
      Left            =   480
      OleObjectBlob   =   "Form2.frx":0024
      Top             =   6960
   End
End
Attribute VB_Name = "Form2"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False

Private Sub AddMarkerButton_Click()
    
    With OPOSElectronicJournal1
        ' Add marker to storage
        .AddMarker MarkerEdit.Text
        
        ' Notify error
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Failed to Add Marker." + vbCrLf + "ResultCode = " + CStr(.ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(.ResultCodeExtended)
        End If
    End With
    
End Sub


Private Sub EraseMediumButton_Click()

    Dim MsgResult As Integer
    
    MsgResult = MsgBox("Are you sure you want to erase medium?", vbOKCancel, "EJSample_Step2")
    
    ' Erase all stored print data.
    If MsgResult = vbOK Then
        With OPOSElectronicJournal1
            .EraseMedium
            
            ' Notify error
            If .ResultCode <> OPOS_SUCCESS Then
                MsgBox "Failed to Print Content. " + vbCrLf + "ResultCode = " + CStr(.ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(.ResultCodeExtended)
            End If
        End With
    End If

End Sub

Private Sub ExitButton_Click()

    Unload Me

End Sub

Private Sub Form_Load()


    With OPOSPOSPrinter1
        .Open "Unit1"
        'Check whether the device is succeed to open, or not
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to open the POSPrinter device."
            GoTo LoadErrorPtr
        End If
        
        .ClaimDevice 1000
        'Check whether the device is claim to use, or not
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to claim the POSPrinter device."
            GoTo LoadErrorPtr
        End If

        If .CapPowerReporting <> OPOS_PR_NONE Then
            .PowerNotify = OPOS_PN_ENABLED
        End If

       .DeviceEnabled = True
        'Check whether the device is enable to use, or not
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Disable to use the POSPrinter device."
            GoTo LoadErrorPtr
        End If
        
    End With
        
    With OPOSElectronicJournal1
        
        .Open "Unit1"
        'Check whether the device is succeed to open, or not
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to open the ElectronicJournal device."
            GoTo LoadErrorEJ
            Exit Sub
        End If
        
        .ClaimDevice 1000
        'Check whether the device is claim to use, or not
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to claim the ElectronicJournal device."
            GoTo LoadErrorEJ
        End If

        .DeviceEnabled = True
        'Check whether the device is enable to use, or not
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to use the ElectronicJournal device."
            GoTo LoadErrorEJ
            Exit Sub
        End If
        
        .StorageEnabled = True
        'Check whether the device is store enabled to use, or not
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to storage enabled."
            GoTo LoadErrorEJ
            Exit Sub
        End If
        
        If .StorageEnabled Then
            StorageEnabledCheck.Value = 1
        Else
            GoTo LoadErrorEJ
            Exit Sub
        End If
    
    End With

    PrintButton.Enabled = True
    
Exit Sub

LoadErrorPtr:
    
    'Disable POSPrinter Control
    PrintButton.Enabled = False

    ExitButton.Enabled = True
    
LoadErrorEJ:
    
    'Disable ElectronicJournal Control
    StorageEnabledCheck.Enabled = False
    AddMarkerButton.Enabled = False
    MarkerEdit.Enabled = False
    PrintContentButton.Enabled = False
    StartMarkerEdit.Enabled = False
    EndMarkerEdit.Enabled = False
    EraseMediumButton.Enabled = False
    
    ExitButton.Enabled = True

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSPOSPrinter1
        
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    
    End With
        
    With OPOSElectronicJournal1
        
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    
    End With

End Sub

Private Sub PrintButton_Click()

    ' Print receipt by POSPrinter.
    ' For detail refer POSPrinter SampleProgram.
    Dim rcSpacing As Long
    Dim rcHeight As Long
    Dim ESC As String * 1
    Dim fDate As String

    MousePointer = vbHourglass
    ESC = Chr(&H1B)
    fDate = Format(Now, "mmmm dd, yyyy  AM/PM h:mm")
    
    With OPOSPOSPrinter1
        rcSpacing = .RecLineSpacing
        rcHeight = .RecLineHeight
        .TransactionPrint PTR_S_RECEIPT, PTR_TP_TRANSACTION

        .RotatePrint PTR_S_RECEIPT, PTR_RP_LEFT90
        
        .PrintNormal PTR_S_RECEIPT, ESC + "|4C" + ESC + "|bC" + "   Receipt     "
        .PrintNormal PTR_S_RECEIPT, ESC + "|3C" + ESC + "|2uC" + "       Mr. Brawn" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|2uC" + "                                                  " + vbCrLf + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|2uC" + ESC + "|3C" + "        Total payment              $" + ESC + "|4C" + "21.00  " + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|1C" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, fDate + " Received" + vbCrLf + vbCrLf
        .RecLineHeight = 24
        .RecLineSpacing = .RecLineHeight
        .PrintNormal PTR_S_RECEIPT, ESC + "|uC" + " Details               " + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|1C" + "                          " + ESC + "|2C" + "OPOS Store" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|uC" + " Tax excluded    $20.00" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|1C" + "                          " + ESC + "|bC" + "Zip code 999-9999" + vbCrLf
        .PrintNormal PTR_S_RECEIPT, ESC + "|uC" + " Tax(5%)        $1.00" + ESC + "|N" + "    Phone#(9999)99-9998" + vbCrLf

        .RotatePrint PTR_S_RECEIPT, PTR_RP_NORMAL

        .PrintNormal PTR_S_RECEIPT, ESC + "|fP"

        .TransactionPrint PTR_S_RECEIPT, PTR_TP_NORMAL
        
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Failed to Receipt print. " + vbCrLf + "ResultCode = " + CStr(.ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(.ResultCodeExtended)
        End If

        .RecLineSpacing = rcSpacing
        .RecLineHeight = rcHeight
    End With

    MousePointer = vbDefault

End Sub

Private Sub PrintContentButton_Click()
    
    ' Print storage content by from marker to marker.
    With OPOSElectronicJournal1
        .PrintContent StartMarkerEdit.Text, EndMarkerEdit.Text
        
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Failed to Print Content. " + vbCrLf + "ResultCode = " + CStr(.ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(.ResultCodeExtended)
        End If
    End With

End Sub

Private Sub StorageEnabledCheck_Click()

    ' ElectronicJournal storage Start / Stop
    With OPOSElectronicJournal1
        .StorageEnabled = StorageEnabledCheck.Value

        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Failed to Storage Ready. " + vbCrLf + "ResultCode = " + CStr(.ResultCode) + vbCrLf + "ResultCodeExtended = " + CStr(.ResultCodeExtended)
        End If
        
        Dim CheckBoxValue As Integer
        
        If .StorageEnabled Then
            CheckBoxValue = 1
        Else
            CheckBoxValue = 0
        End If
        
        StorageEnabledCheck.Value = CheckBoxValue
        
    End With
End Sub
