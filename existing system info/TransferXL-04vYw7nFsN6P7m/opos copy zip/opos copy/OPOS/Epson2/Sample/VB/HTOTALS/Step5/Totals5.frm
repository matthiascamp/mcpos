VERSION 5.00
Object = "{CCB90080-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSTotals.ocx"
Begin VB.Form Step5 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 5 Adding error handlers."
   ClientHeight    =   3060
   ClientLeft      =   3045
   ClientTop       =   3330
   ClientWidth     =   5580
   LinkTopic       =   "MDIForm1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   3060
   ScaleWidth      =   5580
   Begin VB.CommandButton cmdExit 
      Caption         =   "Close"
      Height          =   345
      Left            =   4305
      TabIndex        =   9
      Top             =   2520
      Width           =   990
   End
   Begin VB.CommandButton Command5 
      Caption         =   "Delete"
      Height          =   330
      Left            =   315
      TabIndex        =   5
      Top             =   1365
      Width           =   1305
   End
   Begin VB.TextBox Text4 
      Height          =   270
      Left            =   1785
      TabIndex        =   4
      Top             =   840
      Width           =   1485
   End
   Begin VB.TextBox Text3 
      Height          =   270
      Left            =   1785
      TabIndex        =   2
      Top             =   315
      Width           =   1485
   End
   Begin VB.CommandButton Command4 
      Caption         =   "Change"
      Height          =   330
      Left            =   315
      TabIndex        =   3
      Top             =   840
      Width           =   1305
   End
   Begin VB.CommandButton Command3 
      Caption         =   "Create"
      Height          =   330
      Left            =   315
      TabIndex        =   1
      Top             =   315
      Width           =   1305
   End
   Begin VB.ListBox List1 
      Height          =   1035
      Left            =   3780
      TabIndex        =   0
      Top             =   420
      Width           =   1485
   End
   Begin VB.TextBox Text1 
      Height          =   270
      Left            =   1785
      TabIndex        =   7
      Top             =   1995
      Width           =   3480
   End
   Begin VB.CommandButton Command1 
      Caption         =   "Register"
      Height          =   345
      Left            =   315
      TabIndex        =   6
      Top             =   1995
      Width           =   1305
   End
   Begin OposTotals_CCOCtl.OPOSTotals OPOSTotals1 
      Left            =   3600
      OleObjectBlob   =   "Totals5.frx":0000
      Top             =   2400
   End
   Begin VB.Label Label1 
      Caption         =   "File List"
      Height          =   225
      Left            =   3780
      TabIndex        =   8
      Top             =   210
      Width           =   1485
   End
End
Attribute VB_Name = "Step5"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
' Step 5 Adding error handlers.
Option Explicit

' Make a list of the all files
'
Sub ListRefresh()

    Dim i As Integer
    Dim pFileName As String
    
    pFileName = ""

    OPOSTotals1.FindByIndex 0, pFileName
    List1.Clear
    Do
        i = InStr(pFileName, vbCr)
        If i = 0 Then Exit Do
        List1.AddItem Left(pFileName, i - 1)
        pFileName = Mid(pFileName, i + 1)
    Loop

End Sub

Private Sub cmdExit_Click()

    Unload Me

End Sub

' Write information in the selected file
'
Private Sub Command1_Click()

    Dim pSize As Long
    Dim pHandle As Long

    If OPOSTotals1.Find(List1.Text, pHandle, pSize) <> OPOS_SUCCESS Then
        MsgBox "Fails to get the file handle."
        Exit Sub
    End If
    
    If OPOSTotals1.Write(pHandle, Text1.Text, 0, LenDBCS(Text1.Text)) <> OPOS_SUCCESS Then
        MsgBox "Fails to delete."
        Exit Sub
    End If

End Sub

' Make files
'
Private Sub Command3_Click()

    Dim pHandle As Long

' Check whether there is free capacity for maiking files, or not
    If OPOSTotals1.FreeData < 128 Then
        MsgBox "Cannot be secured for the free capacity for the totals device"
        Exit Sub
    End If

' Check on the limit of numbers of the files
'(Only when using the NVRAM as the device, needed to make a limit on files. When using CompactFlash, no need for this.)
    If OPOSTotals1.NumberOfFiles >= 9 Then
        MsgBox "The maximum number of total files are up to 10."
        Exit Sub
    End If

' Create a file name using the text input into the box. Creat it with 128bytes.
    If OPOSTotals1.Create(Text3.Text, pHandle, 128, False) <> OPOS_SUCCESS Then
        MsgBox "Fails to create a file."
        Exit Sub
    End If

    Call ListRefresh                    ' Update the file list.

End Sub

' Modify a file name selected on the list.
'
Private Sub Command4_Click()

    Dim pSize As Long
    Dim pHandle As Long

' Request for a file handle.
    If OPOSTotals1.Find(List1.Text, pHandle, pSize) <> OPOS_SUCCESS Then
        MsgBox "Fails to get the file handle."
        Exit Sub
    End If

' Modigy a file name as input into the text box, using the requested file handle.
    If OPOSTotals1.Rename(pHandle, Text4.Text) <> OPOS_SUCCESS Then
        MsgBox "Fails to rename."
        Exit Sub
    End If

    Call ListRefresh                    ' Update the file list.

End Sub

' Delete the selected files
'
Private Sub Command5_Click()

    If OPOSTotals1.Delete(List1.Text) <> OPOS_SUCCESS Then
        MsgBox "Fails to delete."
        Exit Sub
    End If

    Call ListRefresh                    ' Update the file list.

End Sub


Private Sub Form_Load()

    With OPOSTotals1
        .Open "Unit1"
        ' Error check
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "This device has not been registered, or cannot use."
            GoTo LoadError
        End If
        
        .ClaimDevice 1000
        ' Error check
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Fails to get the exclusive right for the device."
            GoTo LoadError
        End If
        
        .DeviceEnabled = True
        ' Error check
        If .ResultCode <> OPOS_SUCCESS Then
            MsgBox "Now the device is disable to use."
            GoTo LoadError
        End If
    End With

    Call ListRefresh                    ' Update the file list.
    Exit Sub

LoadError:
' Nothing can be used.
    Dim OBJ As Object
    'All objects on the form
    For Each OBJ In Me
        'Invalid exept for OPOS OCX
        If OBJ.Name <> "OPOSTotals1" Then
            OBJ.Enabled = False
        End If
    Next
    cmdExit.Enabled = True              'Only the exit button is enabled.

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSTotals1
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    End With

End Sub

'Handle when a file is selected on the list.
'
Private Sub List1_Click()

    Dim pHandle As Long
    Dim pSize As Long
    Dim pData As String
    
    pData = ""

' Copy the selected file name to (Change) button.
    Text4.Text = List1.Text

' Request a file handle from the selected file name.
    If OPOSTotals1.Find(List1.Text, pHandle, pSize) <> OPOS_SUCCESS Then
        MsgBox "Fails to get the file handle."
        Exit Sub
    End If
' Read a registered information from the requested file handle, and display it.
    If OPOSTotals1.Read(pHandle, pData, 0, pSize) <> OPOS_SUCCESS Then
        MsgBox "Fails to delete."
        Exit Sub
    End If

    Text1.Text = pData

End Sub

Function LenDBCS(Data As String) As Long

    Dim i As Integer
    Dim m As Integer
    Dim c As Integer

    m = Len(Data)
    c = 0
    
    For i = 1 To m
        If Asc(Mid(Data, i, 1)) < 0 Then c = c + 1
    Next i

    LenDBCS = m + c

End Function

